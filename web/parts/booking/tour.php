<?php
function createCacheFile($filePath)
{
  if (!file_exists($filePath)) {
    $initialData = json_encode(['futureConcerts' => [], 'pastConcerts' => [], 'expiry' => 0]);
    file_put_contents($filePath, $initialData);
  }
}

createCacheFile(__DIR__ . '/../../cache/bookingConcertsData.json');
?>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
<script src="/build/js/airtable.js"></script>
<script>
  var Airtable = require('airtable');
  Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'patUtNQqAKEWtjHmE.b2784a36b2affaed528b285e34f404b7719cdb950c7ed141558dc7a9b363b8d2'
  });
  var base = Airtable.base('appOvGQqOefkMpE9o');

  var loadConcerts = function() {
    var futureConcertEl = document.getElementById('future-dates');
    var pastConcertEl = document.getElementById('past-dates');

    var cacheFilePath = '/cache/bookingConcertsData.json';
    var cacheExpiryTime = 24 * 60 * 60 * 1000; // 24 hours

    fetch(cacheFilePath)
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error('Cache file not found');
        }
      })
      .then(data => {
        var now = new Date().getTime();
        if (now < data.expiry) {
          renderConcerts(data.futureConcerts, futureConcertEl, 'On Tour !', 'Currently on well deserved holidays');
          renderConcerts(data.pastConcerts, pastConcertEl, 'Past gigs', '');
        } else {
          throw new Error('Cache expired');
        }
      })
      .catch(() => {
        fetchConcertsData().then(data => {
          var now = new Date().getTime();
          var cacheData = {
            futureConcerts: data.futureConcerts,
            pastConcerts: data.pastConcerts,
            expiry: now + cacheExpiryTime
          };
          fetch('/saveCache.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filePath: cacheFilePath,
              data: cacheData
            })
          });
          renderConcerts(data.futureConcerts, futureConcertEl, 'On Tour !', 'Currently on well deserved holidays');
          renderConcerts(data.pastConcerts, pastConcertEl, 'Past gigs', '');
        }).catch(error => {
          console.log(error);
        });
      });
  };

  var fetchConcertsData = function() {
    return new Promise((resolve, reject) => {
      var futureConcerts = [];
      var pastConcerts = [];

      base('Concerts').select({
        sort: [{
          field: 'Date check-in',
          direction: 'asc'
        }],
        filterByFormula: "AND(Past = 'Future', Statut = 'Confirmé')"
      }).eachPage(function page(records, fetchNextPage) {
        futureConcerts = futureConcerts.concat(records);
        fetchNextPage();
      }, function done(error) {
        if (error) {
          reject(error);
        } else {
          base('Concerts').select({
            sort: [{
              field: 'Date check-in',
              direction: 'desc'
            }],
            filterByFormula: "AND(Online, Past = 'Past')"
          }).eachPage(function page(records, fetchNextPage) {
            pastConcerts = pastConcerts.concat(records);
            fetchNextPage();
          }, function done(error) {
            if (error) {
              reject(error);
            } else {
              resolve({
                futureConcerts,
                pastConcerts
              });
            }
          });
        }
      });
    });
  };

  var renderConcerts = function(records, element, title, emptyMessage) {
    let html = "";

    if (records.length) {
      html += '<h2 class="mb-3 text-white h1 text-center">' + title + '</h2>';
      html += '<div class="table w-100 mb-5">';

      records.forEach((record) => {
        let m = dayjs(record.fields['Date check-in'], "YYYYMMDD");

        html += '<div class="row" style="padding: 2px 0;">';
        html += '<div class="text-md-right col col-12 col-md-2">';
        html += '<time datetime="' + m.format("YY-MM-DD") + '">';
        html += m.format("DD.MM.YYYY");
        html += '</time>';
        html += '</div>';
        html += '<div class="col col-6 col-md-5">';
        html += '<strong>' + record.fields.Titre + '</strong>';
        html += '</div>';
        html += '<div class="col col-6 col-md-3">';
        html += record.fields.Ville;
        html += '</div>';
        html += '</div>';
      });

      html += '</div>';
    } else {
      html += '<h3 class="text-white text-center my-5">' + emptyMessage + '</h3>';
    }

    element.innerHTML = html;
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
