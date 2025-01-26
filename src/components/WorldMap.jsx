import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import CountrySelect from './CountrySelect';

const useTradeData = (setTradeData) => {
    const tradeDataRef = useRef([]);
    const centroidMapRef = useRef(new Map());

    useEffect(() => {
        Promise.all([
            d3.json('/world.geojson'),
            d3.json('/centroids.geojson'),
            d3.json('/trade_data.json')
        ]).then(([, centroids, trade]) => {
            tradeDataRef.current = trade;
            setTradeData(trade);

            centroidMapRef.current = new Map(
                centroids.features.map(d => {
                    const countryName = d.properties?.COUNTRY;
                    const coordinates = d.geometry?.coordinates;
                    const [longitude, latitude] = coordinates;
                    return [
                        countryName,
                        { coordinates: [longitude, latitude] }
                    ];
                })
            );
        });
    }, [setTradeData]);

    return { tradeDataRef, centroidMapRef };
};

const Globe = ({ selectedA, setSelectedA, selectedB, setSelectedB, selectedYear, setSelectedYear, setTradeData }) => {
    const [countries, setCountries] = useState([]);
    const svgRef = useRef(null); // Ref for SVG container
    const projectionRef = useRef(null); // Ref for projection
    const selectedRef = useRef({ selectedA: null, selectedB: null, selectedYear: 2020 });
    const { tradeDataRef, centroidMapRef } = useTradeData(setTradeData);

    const redrawTradeConnections = (svg, projection) => {
        svg = svgRef.current;
        projection = projectionRef.current;
        const { selectedA, selectedB, selectedYear } = selectedRef.current;
        console.log("Connecting " + selectedA + " and " + selectedB + " in year " + selectedYear);
        const trade = tradeDataRef.current;
        const centroidMap = centroidMapRef.current;


        // Clear previous connections and markers
        svg.selectAll('.trade-connection').remove();
        svg.selectAll('.defs').remove();

        if (selectedA && selectedB) {
            let dataAB = [];
            let dataBA = [];
            if (selectedB === 'World') {
                dataAB = trade.filter(
                    d => d.reference_area === selectedA && selectedYear === d.TIME_PERIOD
                );
                dataBA = trade.filter(
                    d => d.counterpart_area === selectedA && selectedYear === d.TIME_PERIOD
                );
            } else {
                dataAB = trade.filter(
                    d => d.reference_area === selectedA && d.counterpart_area === selectedB && selectedYear === d.TIME_PERIOD
                );
                dataBA = trade.filter(
                    d => d.reference_area === selectedB && d.counterpart_area === selectedA && selectedYear === d.TIME_PERIOD
                );
            }

            const tooltip = d3.select('#tooltip'); // Reference to the tooltip div

            const drawLine = (source, target, offset) => {
                if (!source || !target) return null;

                // Apply offset to control point to avoid overlap
                const controlPoint = [
                    (source[0] + target[0]) / 2,
                    (source[1] + target[1]) / 2 - offset
                ];

                return d3.line()
                    .x(d => d[0])
                    .y(d => d[1])
                    .curve(d3.curveBasis)([source, controlPoint, target]);
            };

            const drawTradeConnections = (data, color, offset) => {

                // Get the max trade value from the filtered data
                const maxTradeValue = d3.max(data, d => d.OBS_VALUE);

                // Scale the width of the line based on the trade value
                const width = d3.scaleLinear()
                    .domain([0, maxTradeValue])
                    .range([1, 10]);

                svg.append('g')
                    .selectAll('path')
                    .data(data)
                    .enter().append('path')
                    .attr('class', 'trade-connection')
                    .attr('d', (d) => {
                        const source = projection(centroidMap.get(d.reference_area).coordinates);
                        const target = projection(centroidMap.get(d.counterpart_area).coordinates);

                        // Shorten the line by moving the target point slightly towards the source
                        const lineLength = Math.sqrt(Math.pow(target[0] - source[0], 2) + Math.pow(target[1] - source[1], 2));
                        const shortenFactor = 10 / lineLength; // Adjust this factor to control the shortening
                        const shortenedTarget = [
                            target[0] - (target[0] - source[0]) * shortenFactor,
                            target[1] - (target[1] - source[1]) * shortenFactor
                        ];

                        return drawLine(source, shortenedTarget, offset);
                    })
                    .style('fill', 'none')
                    .style('stroke', color)
                    // Set width based on max trade value from the filtered data
                    .style('stroke-width', d => width(d.OBS_VALUE))
                    .style('stroke-linecap', 'round')
                    .attr('marker-end', 'url(#arrow' + offset + ')')
                    .on('click', (d) => {
                        console.log("Line clicked:", d);
                    })
                    .on('mouseover', function (event, d) {
                        tooltip.style('visibility', 'visible')
                            .style('opacity', 1)
                            .html(`Trade Value: ${d.OBS_VALUE.toFixed(2)} Mil.$<br>From: ${d.reference_area}<br>To: ${d.counterpart_area}`);
                        tooltip.style('left', `${event.pageX + 10}px`)
                            .style('top', `${event.pageY - 30}px`);
                        d3.selectAll('.trade-connection').style('opacity', 0.3);
                        d3.select(this).style('opacity', 1);
                    })
                    .on('mouseout', () => {
                        tooltip.style('visibility', 'hidden')
                            .style('opacity', 0);
                        d3.selectAll('.trade-connection').style('opacity', 1);
                    });

                svg.append('defs')
                    .attr('class', 'defs')
                    .append('marker')
                    .attr('id', 'arrow' + offset)
                    .attr('viewBox', '0 -5 10 10')
                    .attr('refX', 0)
                    .attr('refY', 0)
                    .attr('markerWidth', 2)
                    .attr('markerHeight', 2)
                    .attr('orient', 'auto')
                    .append('path')
                    .attr('d', 'M0,-5L10,0L0,5')
                    .style('fill', color);
            };

            // Draw export lines (red) with offset
            drawTradeConnections(dataAB, 'var(--export)', 50);

            // Draw import lines (blue) with opposite offset
            drawTradeConnections(dataBA, 'var(--import)', -50);

        }

        // Update svgRef
        svgRef.current = svg;
    };

    const checkTradeData = (data, country) => {
        return data.some(d => d.reference_area === country || d.counterpart_area === country);
    };

    useEffect(() => {
        if (svgRef.current) return; // Initialize only once

        const container = document.getElementById('globeContainer');
        const width = container.clientWidth;    // Get width
        const height = container.clientHeight;  // Get height
        const maxlat = 83;


        // Dimensions and projection
        const projection = d3.geoMercator()
            .scale(200)
            .translate([width / 2, height / 2])
            .rotate([0, 0]);

        projectionRef.current = projection;

        const path = d3.geoPath().projection(projection);

        const svg = d3.select('#globeContainer')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .style('background-color', '#111');

        svgRef.current = svg;

        const globe = svg.append('g');

        // Add a sphere for the globe background
        globe.append('path')
            .datum({ type: 'Sphere' })
            .attr('d', path)
            .style('fill', "var(--ocean)")
            .style('stroke', "var(--borders)")
            .style('stroke-width', 0.5);

        // Add a frame around the map
        svg.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', width)
            .attr('height', height)
            .style('fill', 'none')
            .style('stroke', 'white') // Change this to your desired frame color
            .style('stroke-width', 2); // Change this to your desired frame width


        // Load data
        Promise.all([
            d3.json('/world.geojson'),
            d3.json('/centroids.geojson'), // Replace with actual path
            d3.json('/trade_data.json') // Replace with actual path
        ]).then(([world, centroids, trade]) => {
            setCountries(world.features.map((d) => d.properties.name));
            tradeDataRef.current = trade;
            setTradeData(trade);

            // Draw the map
            const paths = globe.append('g')
                .selectAll('path')
                .data(world.features)
                .enter().append('path')
                .attr('d', path)
                .style('fill', (d) => {
                    // If there is some record in the trade data for this country, color it with var(--earth) else give it gray color
                    return checkTradeData(trade, d.properties.name) ? "var(--earth)" : "var(--gray)";

                })
                // set different cursor for countries with trade data
                .style('cursor', (d) => {
                    return checkTradeData(trade, d.properties.name) ? "pointer" : "not-allowed";
                })
                .style('stroke', "var(--borders)")
                .on('click', (event, d) => {
                    const countryName = d.properties.name;

                    // If the country has no trade data, do not proceed with the click event
                    if (!checkTradeData(trade, countryName)) return;

                    // Use the ref to manage the selected state
                    const { selectedA, selectedB, selectedYear } = selectedRef.current;

                    if (!selectedA || selectedB) {
                        // Set selectedA to the clicked country and clear selectedB
                        selectedRef.current = { selectedA: countryName, selectedB: null, selectedYear };
                        setSelectedA(countryName);
                        setSelectedB(null);
                    } else if (selectedA && !selectedB && selectedA !== countryName) {
                        // Set selectedB to the clicked country
                        selectedRef.current = { selectedA, selectedB: countryName, selectedYear };
                        setSelectedB(countryName);
                    }

                    console.log("Selected A:", selectedRef.current.selectedA);
                    console.log("Selected B:", selectedRef.current.selectedB);
                })

            // Assuming the data is in the variable 'centroids', which follows the format you shared
            centroidMapRef.current = new Map(
                centroids.features.map(d => {
                    const countryName = d.properties?.COUNTRY;
                    const coordinates = d.geometry?.coordinates;
                    const [longitude, latitude] = coordinates;
                    return [
                        countryName,
                        { coordinates: [longitude, latitude] }
                    ];
                })
            );

            // find the top left and bottom right of current projection
            function mercatorBounds(projection, maxlat) {
                var yaw = projection.rotate()[0],
                    xymax = projection([-yaw + 180 - 1e-6, -maxlat]),
                    xymin = projection([-yaw - 180 + 1e-6, maxlat]);

                return [xymin, xymax];
            }

            // set up the scale extent and initial scale for the projection
            var b = mercatorBounds(projection, maxlat),
                s = width / (b[1][0] - b[0][0]),
                scaleExtent = [s, 10 * s];

            // track last translation and scale event we processed
            var tlast = [0, 0],
                slast = null;

            // Add drag behavior for horizontal rotation
            const drag = d3.drag().on('drag', (event) => {
                var dx = event.dx,
                    dy = event.dy,
                    tp = projection.translate(),
                    scale = projection.scale();
                if (scale !== slast) {
                    projection.scale(scale);
                } else {
                    var yaw = projection.rotate()[0]

                    projection.rotate([yaw + (360 * dx / width) * scale / 200, 0, 0]);

                    var b = mercatorBounds(projection, maxlat);

                    if (b[0][1] + dy > 0) dy = -b[0][1];
                    else if (b[1][1] + dy < height) dy = height - b[1][1];

                    projection.translate([tp[0], tp[1] + dy]);
                }

                tlast = tp;
                slast = scale;
                svg.selectAll('path').attr('d', path); // Update all paths with new projection

                // Redraw trade connections after drag
            }).on("end", () => {
                redrawTradeConnections(svgRef.current, projection)
            })

            // Attach the drag behavior to the SVG container
            svg.call(drag);

            // Add zoom behavior
            const zoom = d3.zoom()
                .scaleExtent(scaleExtent) // Set zoom limits
                .on('zoom', (event) => {
                    const { k } = event.transform;
                    var scale = k * 200;
                    slast = scale;
                    projection.scale(k * 200); // Update projection scale

                    svg.selectAll('path').attr('d', path); // Update paths with new scale

                })
                .on("end", () => {
                    redrawTradeConnections(svgRef.current, projection)
                })

            // Attach the zoom behavior to the SVG container
            svg.call(zoom)
                .on('dblclick.zoom', null); // Disable double-click zoom

            // Store paths for highlighting
            svgRef.current.paths = paths;
        });
    }, [selectedA, selectedB, selectedYear]);

    useEffect(() => {
        if (!svgRef.current || !svgRef.current.paths) return;

        // Highlight countries based on selection
        svgRef.current.paths.style('fill', (d) => {
            if (d.properties.name === selectedA)
                return "var(--export)"
            if (d.properties.name === selectedB) return "var(--secondary)";
            else if (selectedB == 'World') {
                // Highilight all countries that have trade data with selectedA

                // Get all trade data for selectedA
                const trade = tradeDataRef.current;
                const tradeData = trade.filter(
                    d => (d.counterpart_area === selectedA) && selectedYear === d.TIME_PERIOD
                );

                // Get all countries that have trade data with selectedA
                const cntries = tradeData.map(d => d.reference_area);

                if (cntries.includes(d.properties.name)) {
                    return "var(--secondary)";
                } else {
                    return checkTradeData(tradeDataRef.current, d.properties.name) ? "var(--earth)" : "var(--gray)";
                }

            }
            else {
                return checkTradeData(tradeDataRef.current, d.properties.name) ? "var(--earth)" : "var(--gray)";
            }
        });

        const svg = svgRef.current;
        const projection = projectionRef.current;
        selectedRef.current = { selectedA, selectedB, selectedYear };

        redrawTradeConnections(svg, projection);

        // Log the updated state here
        console.log("Selected A:", selectedA);
        console.log("Selected B:", selectedB);
    }, [selectedA, selectedB, selectedYear]);

    return (
        <div style={{ height: "100%", width: "100%", minHeight: "min-content" }}>
            <CountrySelect
                countries={countries}
                selectedA={selectedA}
                selectedB={selectedB}
                setSelectedA={setSelectedA}
                setSelectedB={setSelectedB}
            />
            <div style={{ position: 'relative' }}>
                <div id="globeContainer"></div>
                <div id="tooltip" style={{
                    position: 'absolute',
                    visibility: 'hidden',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '5px',
                    borderRadius: '5px',
                    pointerEvents: 'none',
                    opacity: 0
                }}></div>
            </div>
            <div>
                <form action="">
                    <input
                        type="range"
                        min="1997"
                        max="2020"
                        step="1"
                        value={selectedYear}
                        onChange={(e) => {
                            let year = parseInt(e.target.value);
                            setSelectedYear(year);
                            selectedRef.current = { selectedA, selectedB, selectedYear: year };
                            redrawTradeConnections(svgRef.current, projectionRef.current);
                        }
                        }
                        style={{ width: '100%' }}
                    />
                    <label>Year: {selectedYear}</label>
                </form>
            </div>
        </div>
    );
};

export default Globe;
