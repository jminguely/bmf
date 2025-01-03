<?php

// Airtable API call
require '../vendor/autoload.php';

use \TANIOS\Airtable\Airtable;

$airtable = new Airtable(array(
  'api_key'   => 'patUtNQqAKEWtjHmE.2ec7dcda8feb95e81e627e0211e9ef3fd31189784434a19e3d7fb4c2e37620d2',
  'base'      => 'appOvGQqOefkMpE9o'
));

$futureConcerts = [];
$pastConcerts = [];
$bookingConcerts = [];

// Fetch future concerts
$params = array("filterByFormula" => "AND(Online, Past = 'Future')");
$request = $airtable->getContent('Concerts', $params);
do {
  $response = $request->getResponse();
  $futureConcerts = array_merge($futureConcerts, $response['records']);
} while ($request = $response->next());

// Fetch past concerts
$params = array("filterByFormula" => "AND(Online, Past = 'Past')");
$request = $airtable->getContent('Concerts', $params);
do {
  $response = $request->getResponse();
  $pastConcerts = array_merge($pastConcerts, $response['records']);
} while ($request = $response->next());

// Fetch booking concerts
$params = array("filterByFormula" => "AND(Past = 'Future', Statut = 'Confirmé')");
$request = $airtable->getContent('Concerts', $params);
do {
  $response = $request->getResponse();
  $bookingConcerts = array_merge($bookingConcerts, $response['records']);
} while ($request = $response->next());

$cacheData = [
  'futureConcerts' => $futureConcerts,
  'pastConcerts' => $pastConcerts,
  'expiry' => time() + 24 * 60 * 60
];

if (file_put_contents(__DIR__ . '/cache/concertsData.json', json_encode($cacheData))) {
  echo "Future and past concerts cache saved successfully.<br/>";
}

$bookingCacheData = [
  'futureConcerts' => $bookingConcerts,
  'pastConcerts' => $pastConcerts,
  'expiry' => time() + 24 * 60 * 60
];

if (file_put_contents(__DIR__ . '/cache/bookingConcertsData.json', json_encode($bookingCacheData))) {
  echo "Booking concerts cache saved successfully.<br/>";
}
