<?php 
    require '../vendor/autoload.php';

    use \TANIOS\Airtable\Airtable;
    $airtable = new Airtable(array(
        'api_key' => 'keyO8mLzx0rpa46cY',
        'base'    => 'appOvGQqOefkMpE9o'
    ));

    $params = array(
        "fields" => ['Date check-in', 'Titre', 'Ville'],
        "sort" => [
            [
                'field' => 'Date check-in', 
                'direction'=> 'asc'
            ]
        ],
        "filterByFormula" => "AND(Online, Statut = 'Futur')"
    );
    
    $request = $airtable->getContent( 'Concerts', $params);
    
?>
<section id="tour" class="bg-ruby py-5 d-flex flex-column">
  <img src="build/svg/radio.svg" class="img-radio">
  <div class="container py-5">
    <div class="row">
      <div class="col-md-10 offset-md-1">
        <h2 class="mb-3 text-white h1 text-center
          ">On Tour !</h2>
        <div class="table w-100 mb-5">
            <?php
            do {
                $response = $request->getResponse();
                foreach ($response['records'] as $key => $record) {
                    $m = new \Moment\Moment($record->fields->{'Date check-in'}, 'Europe/Zurich');
                    ?>
                    <div class="row">
                        <div class="date col-4 col-md-4"><?php echo $m->format("d.m.y"); ?></div>
                        <div class="event col-8 col-md-4"><?php echo $record->fields->Titre; ?></div>
                        <div class="location col-8 offset-4 offset-md-0 col-md-4"><?php echo $record->fields->Ville; ?></div>
                    </div>
                    <?php                    
                }
            }
            while( $request = $response->next() );
            ?>
        </div>
      </div>
    </div>
  </div>
</section>