import svgIcons from '../icons/svg-icons';
import layout from '../config/layout';

svgIcons(); // Must run as soon as possible

(function ($) {
  $(document).ready(function () {
    layout();

    $('.internal-link').click(function(e){
      var targetId = $(this).attr('href').substr(1);

      $('html, body').animate({
          scrollTop: $(`#${targetId}`).offset().top
      }, 1000, "swing");

      e.preventDefault();
    });
  });
})(jQuery);
