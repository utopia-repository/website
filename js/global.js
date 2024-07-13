// Map which sections are available for each OS version
const SUPPORTED_RELEASES = {
    'sid': ['main', 'imports', 'meta'],
    'bookworm': ['main', 'imports', 'meta']
}

// Map distro codenames to display name
const RELEASE_NAMES = {
    'sid': 'Debian Testing/Unstable (trixie/sid)',
    'bookworm': 'Debian 12 (bookworm)'
}

const SIGNED_BY = "[signed-by=/usr/share/keyrings/utopia-repository.asc] ";

// Hack for mirror support
var BASE_URL;
if (window.location.hostname.endsWith('.utopia-repository.org')) {
    BASE_URL = 'https://' + window.location.hostname + '/'
} else {
    BASE_URL = 'https://deb.utopia-repository.org/'
}

// Defines special release/suite combinations in the suite picker
const SPECIAL_CASES = {'experimental': BASE_URL + ' experimental main'}
