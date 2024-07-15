async function parse_index(path, parsing_packages) {
    /**
     * Parse an InRelease or Packages file. (Set parsing_packages=true for the latter)
     */
    const response = await fetch(path);
    console.log("parse_index response", response);
    if (!response.ok) {
        throw new Error(`Could not load status: ${response.status}`);
    }
    const manifest = await response.text();
    const packages = []; // List of maps representing packages
    let group_values = new Map();

    let last_header = null;
    for (const line of manifest.split("\n")) {
        if (line.startsWith('-----')) {
            // PGP messages
            continue;
        }
        // When parsing the Packages file, each package's info is separated by a
        // newline
        if (!line && parsing_packages) {
            if (group_values.size) {
                packages.push(group_values);
            }
            group_values = new Map();
            last_header = null;
            continue;
        }
        const split_index = line.indexOf(':');
        if (split_index == -1) {
            if (last_header) {
                group_values.set(last_header, group_values.get(last_header) + '\n' + line.trim());
            }
            continue;
        }
        const [header, value] = [line.slice(0, split_index), line.slice(split_index + 2)];
        group_values.set(header, value.trim());
        last_header = header;
    }
    return parsing_packages ? packages : group_values;
}

function make_link(href, contents) {
    /**
     * Returns <a href="$href">$contents</a>
     */
    const a = document.createElement('a');
    a.href = href;
    a.append(contents);
    return a;
}

function make_tooltip(tooltip_text, contents) {
    /**
     * Returns <span class="tooltip" title="$tooltip_text">$contents</span>
     */
    const span = document.createElement('span');
    span.classList.add('tooltip');
    span.title = tooltip_text;
    span.append(contents);
    return span;
}

function pretty_bytes(bytes) {
    const units = ['B', 'kB', 'MB', 'GB', 'TB'];
    let units_count = 0;
    while (bytes > 1000 && units_count < units.length) {
        bytes /= 1000;
        units_count++;
    }
    // NBSP to keep the whole size on one line
    return `${bytes.toFixed(2)}\xa0${units[units_count]}`;
}

const _DEPENDENCY_TYPE_TO_CLASS = {
    'Depends': 'depends',
    'Build-Depends': 'depends',
    'Build-Depends-Indep': 'depends',
    'Recommends': 'recommends',
    'Suggests': 'suggests',
    'Enhances': 'enhances',
    'Provides': 'provides',
    'Breaks': '',
    'Conflicts': '',
    'Replaces': ''
}
async function write_package_entries(dist, component, arch, skip_arch_all) {
    /**
     * Write package entries for the distribution + component + arch combinations
     * If arch is 'source', parse the Sources index instead of the binary-<arch> Packages index
     * If skip_arch_all is true, skip writing entries for packages where the package architecture is 'all'
     */
    let url;
    const parse_sources = arch === 'source';
    if (parse_sources) {
        url = new URL(`dists/${dist}/${component}/source/Sources`, BASE_URL);
    } else {
        url = new URL(`dists/${dist}/${component}/binary-${arch}/Packages`, BASE_URL);
    }
    const packages = await parse_index(url, true);
    console.log(`Packages for ${dist}/${component}/${arch}:`, packages);

    const table = document.getElementById('contents');
    for (const package of packages) {
        // package_arch may differ from the requested input arch, e.g.
        // - arch='amd64', package_arch='all'
        // - arch='source', package_arch='all any'
        const package_arch = package.get('Architecture');
        if (skip_arch_all && package_arch === 'all') {
            continue;
        }
        const name = package.get('Package');
        const version = package.get('Version');
        // package_id is used for anchor links
        const package_id = `${name}_${version}_${parse_sources ? 'source' : package_arch}`;
        const description = package.get('Description');  // binary pkgs only
        // const homepage = package.get('Homepage');
        const vcs_browser = package.get('Vcs-Browser'); // source pkgs only
        const built_binaries = package.get('Binary'); // source pkgs only
        let download_url;
        if (parse_sources) {
            const unepoched_version = version.replace(/^\d+:/, '');
            const source_path = `${package.get('Directory')}/${name}_${unepoched_version}.dsc`;
            download_url = new URL(source_path, BASE_URL);
        } else {
            download_url = new URL(package.get('Filename'), BASE_URL);
        }
        const download_size = package.get('Size'); // binary pkgs only

        const row = document.createElement('tr');
        row.id = package_id;

        const package_name_cell = row.insertCell();
        const package_name_span = document.createElement('span');
        package_name_span.classList.add('tooltip');
        let tooltip;
        if (description) {
            const short_description = package.get('Description').split('\n', 1);
            tooltip = `${name} - ${short_description}`;
        } else if (built_binaries) {
            tooltip = `${name} - source package`;
            if (built_binaries != name) {
                tooltip += ` for ${built_binaries}`;
            }
        }
        package_name_cell.append(make_tooltip(tooltip, name));

        const version_cell = row.insertCell();
        version_cell.append(version);

        const download_cell = row.insertCell();
        const download_link_text = parse_sources ? `source (${package_arch})` : package_arch;
        download_cell.append(make_link(download_url, download_link_text));
        if (download_size) {
            download_cell.append(` (${pretty_bytes(download_size)})`);
        }

        const links_cell = row.insertCell();
        if (vcs_browser) {
            links_cell.append(make_link(vcs_browser, vcs_browser));
        } else if (arch !== 'source') {
            // Only source packages have a VCS URL. For binary packages, link to the source
            // if available
            // The Source field may be:
            // - missing, in which we assume the source to be the same name as the binary
            // - a package name
            // - a package name + version ("foo (1.0-1)"), for binnmus
            let source_pkg = package.get('Source');
            let source_name = name;
            let source_version = version;
            if (source_pkg) {
                const source_match = source_pkg.match(/(\S+)(?: \((.*)\))?/);
                source_name = source_match[1] || source_name;
                source_version = source_match[2] || source_version;
            }
            const source_id = `${source_name}_${source_version}_source`;
            links_cell.append('See ', make_link(`#${source_id}`, 'Source'));
        } else {
            links_cell.append('N/A');
        }

        const dependencies_cell = row.insertCell();
        for (const [deptype, depclass] of Object.entries(_DEPENDENCY_TYPE_TO_CLASS)) {
            const dependency_text = package.get(deptype);
            if (dependency_text) {
                const dependency_heading = document.createElement('span');
                dependency_heading.classList.add('dependency');
                if (depclass) {
                    dependency_heading.classList.add(`deptype-${depclass}`);
                }
                dependency_heading.append(deptype, ': ');
                dependencies_cell.append(dependency_heading, dependency_text, document.createElement('br'));
            }
        }
        table.append(row);
    }
}

async function get_dist_info(dist) {
    const url = new URL(`dists/${dist}/InRelease`, BASE_URL);
    return parse_index(url);
}

async function write_contents(dist, component) {
    let dist_info;
    try {
        dist_info = await get_dist_info(dist);
    } catch (e) {
        write_error(`Distribution ${dist} is not in this repository`);
        return;
    }
    const components = dist_info.get('Components').split(" ");
    const archs = dist_info.get('Architectures').split(" ");
    console.log('Got Components:', components, 'Architectures:', archs, 'for', dist);
    if (!components.includes(component)) {
        write_error(`Distribution ${dist} does not contain component ${component}`);
        return;
    }
    let skip_arch_all = false;
    // Process all binary architectures, but only add arch=all packages once
    for (const arch of archs) {
        try {
            await write_package_entries(dist, component, arch, skip_arch_all);
            skip_arch_all = true;
        } catch (e) {
            console.warn(e);
        }
    }
    // Process source packages
    try {
        await write_package_entries(dist, component, 'source');
    } catch (e) {
        console.warn(e);
    }

    const table = document.getElementById('contents');
    document.getElementById('package_count').innerText = table.rows.length;
    return dist_info;
}

function write_error(error_text) {
    console.error(error_text);
    document.getElementById('error_container').innerText =
        `Error: ${error_text}`;
}

async function contents_main() {
    const params = new URLSearchParams(window.location.search);
    const dist = params.get('dist');
    if (!dist) {
        write_error('No dist selected');
        return;
    }
    const component = params.get('component') || 'main';
    await write_contents(dist, component);
}
