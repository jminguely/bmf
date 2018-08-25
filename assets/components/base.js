import svgIcons from '../icons/svg-icons';
import layout from '../config/layout';

svgIcons(); // Must run as soon as possible

(function ($) {
  $(document).ready(function () {
    layout();
  });
})(jQuery);
