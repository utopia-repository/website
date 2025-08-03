// Will be populated at runtime
const DIST_COMPONENTS = {};

// Map distro codenames to display name
const RELEASE_NAMES = {
    'sid': 'Debian Testing/Unstable (forky/sid)',
    'trixie': 'Debian 13 (trixie)',
    'bookworm': 'Debian 12 (bookworm)'
}

const PUBKEY_FILENAME = "/usr/share/keyrings/utopia-repository.asc";

// Hack for mirror support
var BASE_URL;
if (window.location.hostname.endsWith('.utopia-repository.org')) {
    BASE_URL = 'https://' + window.location.hostname + '/'
} else {
    BASE_URL = 'https://deb.utopia-repository.org/';
}
