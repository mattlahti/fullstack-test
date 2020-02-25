<?php
function get_countries($search_type, $search_value)
{
    $base_endpoint = "http://restcountries.eu/rest/v2/";
    $desired_fields = [ "name", "alpha2Code", "alpha3Code", "flag", "region", "subregion", "population", "languages" ];
    $full_text = "";

    if ($search_type === "full_name")
    {
        $full_text = "&fullText=true";
        $search_type = "name";
    }

    $options = "?fields=" . implode(";", $desired_fields) . $full_text;
    $full_endpoint = $base_endpoint . $search_type . "/" . $search_value . $options;

    $curl = curl_init($full_endpoint);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, TRUE);
    $result = json_decode(curl_exec($curl), true);
    curl_close($curl);

    // I don't get a key of status back on a successful request in the RESTCountries API.
    // If I did, I could short-circuit and check for an OK result by something like
    // if (isset($result["status"]) && ($result["status"] >= 200 && $result["status"] < 300))
    if (!isset($result["status"]) && $search_type != "alpha")
    {
        usort($result, function($a, $b) { return $b["population"] <=> $a["population"]; });
    }

    return $result;
}

$countries = get_countries($_GET["search_type"], $_GET["search_value"]);
echo json_encode($countries);