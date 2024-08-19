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
    posts: [],
    feeds: [],

    modalWindow: {
      active: false,
      dataId: '',
    },

    addedUrls: [],

    form: {
      isValid: true,
      feedback: {
        errors: '',
        success: '',
      },
    },
  };

  const validateUrl = (url) => {
    const schema = yup.string()
      .url(i18nInstance.t('errors.invalidURL'))
      .notOneOf(state.addedUrls, i18nInstance.t('errors.alreadyExist'));
    return schema.validate(url);
  };

  const input = document.querySelector('#url-input');
  const form = document.querySelector('.rss-form');
  const feedBackEl = document.querySelector('.feedback');
  const feedsDiv = document.querySelector('.feeds');
  const postsDiv = document.querySelector('.posts');
  const modalTitle = document.querySelector('.modal-title');
  const modalBody = document.querySelector('.modal-body');
  const modalLinkButton = document.querySelector('a.full-article');

  const watchedState = onChange(state, (path, currentValue) => {
    if (path === 'form.feedback.success') {
      feedBackEl.textContent = currentValue;
      feedBackEl.classList.remove('text-danger');
      feedBackEl.classList.add('text-success');
    }

    if (path === 'form.feedback.errors') {
      feedBackEl.textContent = currentValue;
      feedBackEl.classList.remove('text-success');
      feedBackEl.classList.add('text-danger');
    }

    if (path === 'form.isValid') {
      input.classList.toggle('is-invalid', !currentValue);
    }

    if (path === 'feeds') {
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
      postsDiv.innerHTML = `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Посты</h2></div>
      <ul class="list-group border-0 rounded-0"></ul></div></div>`;
      const list = postsDiv.querySelector('ul');
      state.posts.forEach((post) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
        li.innerHTML = `<a href="${post.link}" class="fw-bold" data-id="${post.id}" target="_blank" rel="noopener noreferrer">${post.title}</a>
        <button type="button" class="btn btn-outline-primary btn-sm" data-id="${post.id}" data-bs-toggle="modal" data-bs-target="#modal">Просмотр</button></li>`;
        list.appendChild(li);
      });
    }

    if (path === 'modalWindow.active') {
      const currentPost = state.posts.find((post) => post.id === state.modalWindow.dataId);
      modalTitle.textContent = currentPost.title;
      modalBody.textContent = currentPost.description;
      modalLinkButton.setAttribute('href', currentPost.link);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');

    validateUrl(url)
      .then((validUrl) => {
        watchedState.form.feedback.errors = '';
        watchedState.form.feedback.success = '';
        watchedState.form.isValid = true;
        
        return axios.get(`${routes.allOrigins()}${validUrl}`, { timeout: 10000 });
      })
      .then((response) => {
        const parsedData = parseDOM(response.data.contents);
          const errorNode = parsedData.querySelector('parsererror');
          if (errorNode) {
            watchedState.form.feedback.errors = i18nInstance.t('errors.notContainRSS');
          } else {
            watchedState.addedUrls.push(url);
            watchedState.form.feedback.success = i18nInstance.t('success');
          }

        const feedtitle = parsedData.querySelector('title');
        const feedDescription = parsedData.querySelector('description');
        watchedState.feeds.push({
          title: feedtitle.textContent, 
          description: feedDescription.textContent,
        });

        const posts = parsedData.querySelectorAll('item');
        posts.forEach((post) => {
          const postTitle = post.querySelector('title');
          const postDescription = post.querySelector('description');
          const postLink = post.querySelector('link')
          watchedState.posts.push({
            id: _.uniqueId(),
            title: postTitle.textContent,
            description: postDescription.textContent,
            link: postLink.textContent,
          })
        });
        const viewButtons = document.querySelectorAll('[data-bs-toggle="modal"]');
        viewButtons.forEach((button) => {
          button.addEventListener('click', (e) => {
            e.preventDefault();
            watchedState.modalWindow.active = true;
            watchedState.modalWindow.dataId = 1;
          });
        });    
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
      });
  });
  
};