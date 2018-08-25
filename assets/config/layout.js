import $ from 'jquery';

export default () => {
  $('.main-nav a.internal-link').click(function(e) {
    var target = $(this).attr('href');
    if(!$(target).hasClass('current')) {
      $('body').removeClass (function (index, css) {
        return (css.match (/(^|\s)bg\S+/g) || []).join(' ');
     }).addClass('bg-'+$('.wrapper > .current').attr('data-bg'));
      $('.wrapper > .current').removeClass('current').addClass('past');
      $(target).addClass('current');
      setTimeout(() => {
        $('.wrapper > .past').removeClass('past');
      }, 500);
    }
  });
};
