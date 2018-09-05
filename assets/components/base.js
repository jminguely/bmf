import svgIcons from '../icons/svg-icons';
import layout from '../config/layout';
import calendar from 'molecules/table/calendar.js';

svgIcons(); // Must run as soon as possible

(function ($) {
  $(document).ready(function () {
    layout();
    calendar();
  });
})(jQuery);
