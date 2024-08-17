import * as yup from 'yup';
import onChange from 'on-change';
import i18next from 'i18next';
import ru from './locales/ru.js';
import axios from 'axios';

const parseDOM = (data) => {
  const parser = new DOMParser();
  return parser.parseFromString(data, 'application/xml');
};

const routes = {
  allOrigins: () => 'https://allorigins.hexlet.app/get?disableCache=true&url=',
};

const i18nInstance  = i18next.createInstance();
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

  const watchedState = onChange(state, (path, currentValue) => {
    if (path === 'form.feedback.success') {
      console.log('Success feedback:', currentValue);
      feedBackEl.textContent = currentValue;
      feedBackEl.classList.remove('text-danger');
      feedBackEl.classList.add('text-success');
    }

    if (path === 'form.feedback.errors') {
      console.log('Error feedback:', currentValue);
      feedBackEl.textContent = currentValue;
      feedBackEl.classList.remove('text-success');
      feedBackEl.classList.add('text-danger');
    }

    if (path === 'form.isValid') {
      input.classList.toggle('is-invalid', !currentValue);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');

    validateUrl(url)
      .then((validUrl) => {
        watchedState.form.feedback.errors = '';
        state.addedUrls.push(validUrl);
        
        watchedState.form.isValid = true;
        watchedState.form.feedback.success = i18nInstance.t('success');
        console.log('Success message set:', watchedState.form.feedback.success);

        return axios.get(`${routes.allOrigins()}${validUrl}`);
      })
      .then((response) => {
        const parsedData = parseDOM(response.data.contents);
        
      })
      .catch((err) => {
        watchedState.form.isValid = false;
        watchedState.form.feedback.errors = err.message;
        console.error('Error message set:', err.message);
      });
  });
};