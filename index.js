import * as yup from 'yup';
import onChange from 'on-change';
import i18next from 'i18next';
import ru from './locales/ru.js';
import axios from 'axios';
import _ from 'lodash';

const parseDOM = (data) => {
  const parser = new DOMParser();
  return parser.parseFromString(data, 'application/xml');
};

const routes = {
  allOrigins: () => 'https://allorigins.hexlet.app/get?disableCache=true&url=',
};

const i18nInstance = i18next.createInstance();
i18nInstance.init({
  lng: 'ru',
  debug: true,
  resources: {
    ru,
  },
});

export default () => {
  const state = {
    addedUrls: [],
    posts: [],
    feeds: [],
    visitedLinks: [],
    modalId: '',

    form: {
      isValid: true,
      status: 'filling', // filling, sending
      feedback: {
        errors: '',
        success: '',
      },
    },
  };

  const validateUrl = (url) => {
    const schema = yup.string()
      .url(i18nInstance.t('errors.invalidURL'))
      .notOneOf(state.addedUrls, i18nInstance.t('errors.alreadyExist'))
      .required();
    return schema.validate(url);
  };

  const form = document.querySelector('.rss-form');
  const input = document.querySelector('#url-input');
  const feedBackEl = document.querySelector('.feedback');

  const updateFeedback = (type, message) => {
    feedBackEl.textContent = message;
    feedBackEl.classList.toggle('text-danger', type === 'error');
    feedBackEl.classList.toggle('text-success', type === 'success');
  };

  const watchedState = onChange(state, (path, currentValue) => {
    if (path === 'form.status') {
      const submitButton = document.querySelector('[type="submit"]');
      if (currentValue === 'sending') {
        submitButton.setAttribute('disabled', true);
      } else {
        submitButton.removeAttribute('disabled');
      }
    }

    if (path === 'form.feedback.success') {
      updateFeedback('success', currentValue);
    }

    if (path === 'form.feedback.errors') {
      updateFeedback('error', currentValue);
    }

    if (path === 'form.isValid') {
      input.classList.toggle('is-invalid', !currentValue);
    }

    if (path === 'feeds') {
      const feedsDiv = document.querySelector('.feeds');
      feedsDiv.innerHTML = `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Фиды</h2></div>
      <ul class="list-group border-0 rounded-0"></ul></div>`;
      const list = feedsDiv.querySelector('ul');
      state.feeds.forEach((feed) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'border-0', 'border-end-0');
        li.innerHTML = `<h3 class="h6 m-0">${feed.title}</h3>
        <p class="m-0 small text-black-50">${feed.description}</p>`;
        list.appendChild(li);
      })
    }

    if (path === 'posts') {
      const postsDiv = document.querySelector('.posts');
      postsDiv.innerHTML = `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Посты</h2></div>
      <ul class="list-group border-0 rounded-0"></ul></div></div>`;
      const list = postsDiv.querySelector('ul');
      watchedState.posts.forEach((post) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
        li.innerHTML = `<a href="${post.link}" class="fw-bold" data-id="${post.id}" target="_blank" rel="noopener noreferrer">${post.title}</a>
        <button type="button" class="btn btn-outline-primary btn-sm" data-id="${post.id}" data-bs-toggle="modal" data-bs-target="#modal">Просмотр</button></li>`;
        list.appendChild(li);
      });
    }

    if (path === 'modalId') {
      const currentPost = watchedState.posts.find((post) => post.id === currentValue);
      const modalTitle = document.querySelector('.modal-title');
      const modalBody = document.querySelector('.modal-body');
      const modalLink = document.querySelector('a.full-article');
      modalTitle.textContent = currentPost.title;
      modalBody.textContent = currentPost.description;
      modalLink.setAttribute('href', currentPost.link);
    }

    if (path === 'visitedLinks') {
      const id = _.last(currentValue);
      const link = document.querySelector(`a[data-id="${id}"]`);
      link.classList.replace('fw-bold', 'fw-normal');
      link.classList.add('link-secondary');
    }
  });

  const checkForNewPosts = () => {
    const promises = state.addedUrls.map((url) => 
      axios.get(`${routes.allOrigins()}${url}`, { timeout: 10000 })
        .then((response) => {
          const parsedData = parseDOM(response.data.contents);
          const posts = parsedData.querySelectorAll('item');
          const newPostsArray = [];
          posts.forEach((post) => {
            const postTitle = post.querySelector('title').textContent;
            const postDescription = post.querySelector('description').textContent;
            const postLink = post.querySelector('link').textContent;
            const postId = post.querySelector('guid') ? post.querySelector('guid').textContent : postLink;
            if (!_.some(state.posts, ['id', postId])) {
              newPostsArray.push({ id: postId, title: postTitle, description: postDescription, link: postLink });
            }
          });
          watchedState.posts.unshift(...newPostsArray);
        })
        .catch((err) => {
          console.error(err);
        })
      );
      Promise.all(promises).finally(() => {
        setTimeout(checkForNewPosts, 5000);
      });
    };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');

    validateUrl(url)
      .then((validUrl) => {
        watchedState.form.feedback.errors = '';
        watchedState.form.feedback.success = '';
        watchedState.form.isValid = true;
        watchedState.form.status = 'sending';
        return axios.get(`${routes.allOrigins()}${validUrl}`, { timeout: 10000 });
      })
      .then((response) => {
        const parsedData = parseDOM(response.data.contents);
          const errorNode = parsedData.querySelector('parsererror');
          if (errorNode) {
            watchedState.form.feedback.errors = i18nInstance.t('errors.notContainRSS');
          } else {
            watchedState.addedUrls.push(url);
            watchedState.form.feedback.success = i18nInstance.t('success')
          }

        const feedtitle = parsedData.querySelector('title');
        const feedDescription = parsedData.querySelector('description');
        watchedState.feeds.unshift({
          title: feedtitle.textContent, 
          description: feedDescription.textContent,
        });

        const posts = parsedData.querySelectorAll('item');
        const postsArray = [];
        posts.forEach((post) => {
          const postTitle = post.querySelector('title').textContent;
          const postDescription = post.querySelector('description').textContent;
          const postLink = post.querySelector('link').textContent;
          const postId = post.querySelector('guid') ? post.querySelector('guid').textContent : postLink;
          postsArray.unshift({
            id: postId,
            title: postTitle,
            description: postDescription,
            link: postLink,
          })
        });
        postsArray.reverse();
        watchedState.posts.unshift(...postsArray);
        e.target.reset();
        input.focus();
        watchedState.form.status = 'filling';
        checkForNewPosts();
      })
      .catch((err) => {
        watchedState.form.isValid = false;
        if (axios.isAxiosError(err)) {
          if (err.request) {
            watchedState.form.feedback.errors = i18nInstance.t('errors.networkError');
          }
        } else {
          watchedState.form.feedback.errors = err.message;
        }
        watchedState.form.status = 'filling';
      });
  });

  const modal = document.getElementById('modal');
  modal.addEventListener('show.bs.modal', (e) => {
    const currentPostId = e.relatedTarget.getAttribute('data-id');
    watchedState.visitedLinks.push(currentPostId);
    watchedState.modalId = currentPostId;
  });

  const links = document.querySelectorAll('.fw-bold');
  links.forEach((link) => {
    link.addEventListener('click', () => {
      const linkId = link.getAttribute('data-id');
      watchedState.visitedLinks.push(linkId);
    });
  })
};