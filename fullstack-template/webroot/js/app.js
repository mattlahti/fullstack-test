const endpoint = "http://localhost:8765/api/index.php";
let regions = {};

const dom = 
{
    "search": 
    {
        "input": document.getElementById("search-input"),
        "button": document.getElementById("search-button"),
        "types": document.getElementsByName("search-type")
    },
    "results":
    {
        "body": document.getElementById("results-body"),
        "message": document.getElementById("results-message"),
        "regions": document.getElementById("results-regions")
    }
};

function in_range(value, lower, upper)
{
    return (value >= lower) && (value <= upper);
}

function serialize_object(object) 
{
    let result = "";
    const entries = Object.entries(object);
    
    for (let i = 0; i < entries.length; i++)
    {
        result += `${i > 0 ? "&" : "?"}${entries[i][0]}=${entries[i][1]}`;
    }

    return result;
}

function get_checked_radio(buttons) 
{
    let result = "";

    for (let i = 0; i < buttons.length; i++)
    {
        if (buttons[i].checked)
        {
            result = buttons[i].value;
            break;
        }
    }

    return result;
}

function languages_to_string(languages)
{
    let result = "";
    
    for (let i = 0; i < languages.length; i++)
    {
        result += `${languages[i].name}${i === languages.length - 1 ? "" : ", "}`;
    }

    return result;
}

function display_error(message) 
{
    dom.results.body.innerHTML = "";
    dom.results.message.innerHTML = message;
    dom.search.input.classList.add("red-border");
    dom.search.button.disabled = false;
}

function display_loader()
{
    dom.results.body.innerHTML = "";
    dom.results.message.innerHTML = "";
    // Disabling the button also disables form submissions, so you can't spam-click or spam-enter
    // while a request is still loading.
    dom.search.button.disabled = true;

    let ripple_loader = document.createElement("div");
    ripple_loader.classList.add("loading-ripple");
    let first_div = document.createElement("div");
    let second_div = document.createElement("div");
    ripple_loader.append(first_div, second_div);
    dom.results.message.append(ripple_loader);
}

function clear_loader()
{
    dom.results.message.innerHTML = "";
    dom.search.button.disabled = false;
}

function clear_regions()
{
    regions = {};
    dom.results.regions.innerHTML = "";
}

dom.search.input.onkeydown = () => 
{
    dom.search.input.classList.remove("red-border");
};

dom.search.button.onclick = e => 
{
    e.preventDefault();
    const checked_type = get_checked_radio(dom.search.types);
    clear_regions();

    if (!dom.search.input.value)
    {
        display_error("You must specify a query to search for.");
        return;
    }
    else if (checked_type === "alpha" && !in_range(dom.search.input.value.length, 2, 3))
    {
        display_error("A country code must be either 2 or 3 characters.");
        return;
    }
    // There are 3 cases where the letters are not a-z (case insensitive): ç, Å, and é
    // Searching by those characters in the API just turns them into c, A, and e respectively and performs the search.
    // If that wasn't the case, I would probably omit this condition.
    else if (!/^[a-zA-Z]+$/.test(dom.search.input.value))
    {
        display_error("Your input should only be letters from A to Z, case insensitive.");
        return;
    }

    const request_data = 
    {
        "search_value": dom.search.input.value,
        "search_type": get_checked_radio(dom.search.types)
    };

    const serialized_data = serialize_object(request_data);

    display_loader();

    fetch(`${endpoint}${serialized_data}`)
        .then(response => response.json())
        .then(json => {
            if (json.status === 400)
            {
                display_error(`Bad request for query of "${dom.search.input.value}".`);
                return;
            }
            else if (json.status === 404)
            {
                display_error(`No results found for the query "${dom.search.input.value}".`);
                return;
            }

            clear_loader();

            if (checked_type === "alpha")
            {
                display_country(json);
                display_regions();
            }
            else 
            {
                for (let i = 0; i < json.length; i++) 
                {
                    display_country(json[i]);
                }

                display_regions();
            }
        });
};

function display_country(country)
{
    regions[country.region] = regions[country.region] || {};
    regions[country.region][country.subregion] = (regions[country.region][country.subregion] || 0) + 1;

    // I can see how JSX would be very useful here
    let li_el = document.createElement("li");
    li_el.innerHTML = `
        <p class="name">${country.name}</p>
        <p class="region">${country.alpha2Code} / ${country.alpha3Code}</p>
        <p class="region">${country.region || "No region"} - ${country.subregion || "No subregion"}</p>
        <div class="flag-wrapper">
            <img class="flag" src="${country.flag}"  alt="${country.name} Flag"/>
        </div>
        <p class="population">Population: ${country.population.toLocaleString()}</p>
        <p class="languages">Language${country.languages.length > 1 ? "s" : ""}: ${languages_to_string(country.languages)}</p>\
    `;

    dom.results.body.appendChild(li_el);
}

function display_regions()
{
    // Again, JSX or an ngFor would make this whole section a lot prettier but sticking with vanilla
    let header = document.createElement("h1");
    header.classList.add("region-header");
    header.innerHTML = "Regions";
    dom.results.regions.appendChild(header);
    let total_countries = 0;

    for (let [region_name, subregions] of Object.entries(regions))
    {
        let region_count = 0;

        let column_el = document.createElement("div");
        column_el.classList.add("region-column");
        let region_header = document.createElement("div");
        region_header.classList.add("region-column-header");
        let region_body = document.createElement("div");
        region_body.classList.add("region-column-body");

        for (let [subregion_name, subregion_count] of Object.entries(subregions))
        {
            region_count += subregion_count;
            region_body.innerHTML += `${subregion_name || "No subregion"}: ${subregion_count}<br>`;
        }

        region_header.innerHTML += `${region_name || "No region"}: ${region_count}`;
        column_el.append(region_header, region_body);
        dom.results.regions.appendChild(column_el);
        total_countries += region_count;
    }

    document.getElementsByClassName("region-header")[0].innerHTML += ` (${total_countries} total ${total_countries > 1 ? "countries" : "country"})`;
}

// I don't need to use a document ready check here because the script is loaded after the rest
// of the body of the DOM is drawn (script is at the bottom of the body)
function main()
{
    dom.search.input.focus();
}

main();