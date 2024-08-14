import * as yup from 'yup';
import onChange from 'on-change';

let schema = yup.string().url('Ссылка должна быть валидным URL');

export default () => {
  const state = {
    form: {
      isValid: true,
      alreadyExist: false,
      containsValidRss: true,
      error: '',
    },
  };

  const input = document.querySelector('#url-input');
  const form = document.querySelector('.rss-form');
  const feedBackEl = document.querySelector('.feedback');

  const watchedState = onChange(state, (path, currentValue) => {
    if (path === 'form.error') {
      feedBackEl.textContent = currentValue;
    }

    if (path === 'form.isValid') {
      if (state.form.isValid === false) {
        input.classList.add('is-invalid');
      } else {
        input.classList.remove('is-invalid');
      }
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    schema.validate(url)
      .then(() => {
        watchedState.form.isValid = true;
        watchedState.form.error = '';
      })
      .catch((error) => {
        watchedState.form.error = error.message;
        watchedState.form.isValid = false;
      })
  });
};