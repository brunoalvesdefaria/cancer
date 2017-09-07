import Viewer from '../viewer/viewer';
import {annotatorsDB} from '../db/db';
import Signup from '../signup/signup';

const $loadingImg = $('.login-wrapper form button.submit img.loading');
const $loginForm = $('.login-wrapper');
const $loginWrapper = $('.login-wrapper');
const $viewWrapper = $('.viewer-wrapper');
const $overlay = $('.loading-overlay');

$('.login-wrapper form').off('submit').on('submit', function (evt) {
  evt.preventDefault();

  $loadingImg.removeClass('invisible');
  const username = $('#login-username').val();
  console.log('username:', username);

  annotatorsDB.get(username).then((user) => {
    console.log('username', username, 'exist');
    $loadingImg.addClass('invisible');
    $loginForm.addClass('invisible');

    Viewer.initViewer();
  }).catch((err) => {
    $('#login-error').text(`Username ${username} is not found. Try another username or sign up for a new account`)
    $('#login-error').removeClass('invisible');
    $('#login-username').val('');
    $loadingImg.addClass('invisible');
  });

  // Mocking login
  // setTimeout(function () {
  //   $loadingImg.addClass('invisible');
  //   $loginForm.addClass('invisible');
  //
  //   Viewer.initViewer();
  // }, 1000);
});

$('#open-signup-btn-new').off('click').click(function(event) {
  event.preventDefault();

  $loginWrapper.addClass('invisible');

  new Signup().init();
  // console.log('sighnup is called');
  // Signup.init();
});


export default {
  $loginWrapper,
  $viewWrapper,
  $overlay,
  logout() {
    this.$overlay.addClass('invisible');
    this.$loginWrapper.removeClass('invisible');
    this.$viewerWrapper.addClass('invisible');
  }
}
