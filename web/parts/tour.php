<?php
function renderConcerts($records, $title, $emptyMessage)
{
  $html = "";

  if (count($records)) {
    $html .= '<h2 class="mb-3 text-white h1 text-center">' . $title . '</h2>';
    $html .= '<div class="table w-100 mb-5">';

    foreach ($records as $record) {
      $m = date_create($record['fields']['Date check-in']);
      if ($m) {
        $html .= '<div class="row">';
        $html .= '<div class="text-right col-3 offset-md-1">';
        $html .= '<time datetime="' . $m->format("Y-m-d") . '">';
        $html .= '<strong>' . $m->format("d.m") . '</strong><br />';
        $html .= '<span class="bigText">' . $m->format("Y") . '</span>';
        $html .= '</time>';
        $html .= '</div>';
        $html .= '<div class="col-6 col-md-5 col-lg-4">';
        $html .= '<strong>' . $record['fields']['Titre'] . '</strong><br />';
        $html .= $record['fields']['Ville'];
        $html .= '</div>';

        if (isset($record['fields']['URL'])) {
          $html .= '<div class="col-3 col-md-3">';
          $html .= '<a class=" mt-2 btn btn-sm btn-outline-secondary" target="_blank" href="' . $record['fields']['URL'] . '">Details</a>';
          $html .= '</div>';
        }

        $html .= '</div>';
      }
    }

    $html .= '</diu>';
  } else {
    $html .= '<h3 class="text-white text-center my-5">' . $emptyMessage . '</h3>';
  }

  return $html;
}


$cacheFilePath = __DIR__ . '/../cache/concertsData.json';
$cacheData = json_decode(file_get_contents($cacheFilePath), true);


$futureConcertsHtml = renderConcerts($cacheData['futureConcerts'], 'On Tour !', 'Currently on well deserved holidays');
$pastConcertsHtml = renderConcerts($cacheData['pastConcerts'], 'Past gigs', '');

?>
<section id="tour" class="bg-waxxx py-5 d-flex flex-column">
  <div class="container py-5">
    <div class="row">
      <div class="col-md-10 offset-md-1">
        <div id="future-dates"><?php echo $futureConcertsHtml; ?></div>
        <div id="past-dates"><?php echo $pastConcertsHtml; ?></div>
      </div>
    </div>
  </div>
  </div>
</section>
