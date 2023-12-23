<?php
// $paramsFuture = array(
//   "fields" => ['Date check-in', 'Titre', 'Ville', 'URL'],

// );


// $paramsPast = array(
//   "fields" => ['Date check-in', 'Titre', 'Ville'],
//   "sort" => [
//     [
//       'field' => 'Date check-in',
//       'direction' => 'desc'
//     ]
//   ],
//   "filterByFormula" => "AND(Online, Past = 'Past')"
// );

?>

<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
<script src="/build/js/airtable.js"></script>
<script>
  var Airtable = require('airtable');
  var base = new Airtable({
    apiKey: 'keyO8mLzx0rpa46cY'
  }).base('appOvGQqOefkMpE9o');


  var loadConcerts = function() {
    var futureConcertEl = document.getElementById('future-dates');

    base('Concerts').select({
      sort: [{
        field: 'Date check-in',
        direction: 'asc'
      }],
      filterByFormula: "AND(Online, Past = 'Future')"
    }).eachPage(function page(records, fetchNextPage) {

      let futureConcertElHtml = "";

      if (records.length) {
        futureConcertElHtml += '<h2 class="mb-3 text-white h1 text-center">On Tour !</h2>';
        futureConcertElHtml += '<div class="table w-100 mb-5">';

        records.forEach((record) => {
          let m = dayjs(record.fields['Date check-in'], "YYYYMMDD");

          futureConcertElHtml += '<div class="row">';
          futureConcertElHtml += '<div class="text-right col-3 offset-md-1">';
          futureConcertElHtml += '<time datetime="' + m.format("YY-MM-DD") + '">';
          futureConcertElHtml += '<strong>' + m.format("DD.MM") + '</strong><br />';
          futureConcertElHtml += '<span class="bigText">' + m.format("YYYY") + '</span>';
          futureConcertElHtml += '</time>';
          futureConcertElHtml += '</div>';
          futureConcertElHtml += '<div class="col-6 col-md-5 col-lg-4">';
          futureConcertElHtml += '<strong>' + record.fields.Titre + '</strong><br />';
          futureConcertElHtml += record.fields.Ville;
          futureConcertElHtml += '</div>';

          if (record.fields.URL) {
            futureConcertElHtml += '<div class="col-3 col-md-3">';
            futureConcertElHtml += '<a class=" mt-2 btn btn-sm btn-outline-secondary" target="_blank" href="' + record.fields.URL + '">Details</a>';
            futureConcertElHtml += '</div>';
          }

          futureConcertElHtml += '</div>';
        });

        futureConcertElHtml += '</div>';
      } else {
        futureConcertElHtml += '<h3 class="text-white text-center my-5">Currently on well deserved holidays</h3>';
      }

      futureConcertEl.innerHTML = futureConcertElHtml;
      fetchNextPage();
    }, function done(error) {
      console.log(error);
    });

    var pastConcertEl = document.getElementById('past-dates');

    base('Concerts').select({
      sort: [{
        field: 'Date check-in',
        direction: 'desc'
      }],
      filterByFormula: "AND(Online, Past = 'Past')"
    }).eachPage(function page(records, fetchNextPage) {

      let pastConcertElHtml = "";

      if (records.length) {
        pastConcertElHtml += '<h2 class="mb-3 text-white h1 text-center">Past gigs</h2>';
        pastConcertElHtml += '<div class="table w-100 mb-5">';

        records.forEach((record) => {
          let m = dayjs(record.fields['Date check-in'], "YYYYMMDD");

          pastConcertElHtml += '<div class="row">';
          pastConcertElHtml += '<div class="text-right col-3 offset-md-1">';
          pastConcertElHtml += '<time datetime="' + m.format("YY-MM-DD") + '">';
          pastConcertElHtml += '<strong>' + m.format("DD.MM") + '</strong><br />';
          pastConcertElHtml += '<span class="bigText">' + m.format("YYYY") + '</span>';
          pastConcertElHtml += '</time>';
          pastConcertElHtml += '</div>';
          pastConcertElHtml += '<div class="col-6 col-md-5 col-lg-4">';
          pastConcertElHtml += '<strong>' + record.fields.Titre + '</strong><br />';
          pastConcertElHtml += record.fields.Ville;
          pastConcertElHtml += '</div>';

          if (record.fields.URL) {
            pastConcertElHtml += '<div class="col-3 col-md-3">';
            pastConcertElHtml += '<a class=" mt-2 btn btn-sm btn-outline-secondary" target="_blank" href="' + record.fields.URL + '">Details</a>';
            pastConcertElHtml += '</div>';
          }

          pastConcertElHtml += '</div>';
        });

        pastConcertElHtml += '</div>';
      }

      pastConcertEl.innerHTML = pastConcertElHtml;
      fetchNextPage();
    }, function done(error) {
      console.log(error);
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadConcerts();
  });
</script>
<section id="tour" class="bg-waxxx py-5 d-flex flex-column">
  <div class="container py-5">
    <div class="row">
      <div class="col-md-10 offset-md-1">
        <div id="future-dates"></div>
        <div id="past-dates"></div>
      </div>
    </div>
  </div>
  </div>
</section>
