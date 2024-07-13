// Default OS version, components, and repository URL
var selected_os = 'sid'
var selected_components = ['main']

function init() {
    // Populate the drop down list of displayed SUPPORTED_RELEASES with the ones defined above.
    os_selector = document.getElementById('os_selector')

    for (dist in SUPPORTED_RELEASES) {
        option = document.createElement('option')
        option.value = dist
        // Prefer the display name for each distribution, unless it doesn't exist.
        if (RELEASE_NAMES[dist]) {
            option.textContent = RELEASE_NAMES[dist]
        } else {
            option.textContent = dist
        }
        os_selector.appendChild(option)
    }

    update_available_components()
}

function refresh_text() {
    console.log("Selected distribution " + selected_os)
    console.log("Selected components " + selected_components)

    displayed_components = []
    output = ''

    // Add each dist as either a special case or component
    for (i = 0; i < selected_components.length; i++) {
        component = selected_components[i]
        special_url = SPECIAL_CASES[component]

        if (special_url) {
            // XXX: One day, template literals will be more elegant
            special_url = special_url.replace('$current', selected_os)

            output += ('deb ' + SIGNED_BY + special_url + '\ndeb-src ' + SIGNED_BY + special_url + '\n')
        } else {
            displayed_components.push(component)
        }
    }

    if (displayed_components.length > 0) {
        // Write both deb (binary) and deb-src (source) links.
        url = BASE_URL + ' ' + selected_os + ' ' + displayed_components.join(' ')
        // Add the primary sections first
        output = 'deb ' + SIGNED_BY + url + '\ndeb-src ' + SIGNED_BY + url + '\n' + output
    }

    document.getElementById('sources_list').innerHTML = output
}

function update_selected_components() {
    component_selector = document.getElementById('component_selector')
    checkboxes = component_selector.childNodes
    selected_components = []

    // Iterate over all the checkboxes to see if they're checked. If so,
    // add the value they represent to the list of selected components.
    for (i = 0; i < checkboxes.length; i++) {
        checkbox = checkboxes[i]
        if (checkbox.checked) {
            selected_components.push(checkbox.value)
        }
    }
    refresh_text()
}

function update_available_components() {
    component_selector = document.getElementById('component_selector')
    os_selector = document.getElementById('os_selector')

    // First, clear all component choices.
    while (component_selector.hasChildNodes()) {
        component_selector.removeChild(component_selector.lastChild)
    }

    // Find the selected dist and populate a list of component choices
    // using that. Each choice is a check box.
    selected_os = os_selector.options[os_selector.selectedIndex].value
    components = SUPPORTED_RELEASES[selected_os]

    for (var i = 0; i < components.length; i++) {
        component = components[i]
        checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.value = component
        checkbox.onchange = function() {update_selected_components();}

        if (i == 0) {
            // By default, mark the first option (usually the "main" component
            // as enabled).
            checkbox.checked = true
            selected_components = [component]
        }

        component_selector.appendChild(checkbox)
        caption_node = document.createTextNode(component) // create a label for the check box
        component_selector.appendChild(caption_node)
    }

    refresh_text()
}
