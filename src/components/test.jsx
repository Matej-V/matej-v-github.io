import React, { useEffect, useState, useRef, useCallback } from 'react';
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
        ]).then(([world, centroids, trade]) => {
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

const useGlobe = (svgRef, projectionRef, selectedRef, redrawTradeConnections) => {
    useEffect(() => {
        if (svgRef.current) return;

        const container = document.getElementById('globeContainer');
        const width = container.clientWidth;
        const height = container.clientHeight;
        const maxlat = 83;

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

        globe.append('path')
            .datum({ type: 'Sphere' })
            .attr('d', path)
            .style('fill', "var(--ocean)")
            .style('stroke', "var(--borders)")
            .style('stroke-width', 0.5);

        svg.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', width)
            .attr('height', height)
            .style('fill', 'none')
            .style('stroke', 'white')
            .style('stroke-width', 2);

        // find the top left and bottom right of current projection
        function mercatorBounds(projection, maxlat) {
            var yaw = projection.rotate()[0],
                xymax = projection([-yaw + 180 - 1e-6, -maxlat]),
                xymin = projection([-yaw - 180 + 1e-6, maxlat]);

            return [xymin, xymax];
        }

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

                    projection.rotate([yaw + (360 * dx / width), 0, 0]);

                    var b = mercatorBounds(projection, maxlat);

                    if (b[0][1] + dy > 0) dy = -b[0][1];
                    else if (b[1][1] + dy < height) dy = height - b[1][1];

                    projection.translate([tp[0], tp[1] + dy]);
                }

                tlast = tp;
                slast = scale;
                svg.selectAll('path').attr('d', path); // Update all paths with new projection

                // Redraw trade connections after drag
            }).on("end", (e) => {
                redrawTradeConnections(svg, projection)
            })

        svg.call(drag);

        const zoom = d3.zoom()
            .scaleExtent([1, 10])
            .on('zoom', (event) => {
                const { k } = event.transform;
                projection.scale(k * 200);
                svg.selectAll('path').attr('d', path);
            }).on("end", () => {
                redrawTradeConnections(svg, projection);
            });

        svg.call(zoom).on('dblclick.zoom', null);
    }, [svgRef, projectionRef, redrawTradeConnections]);
};

const Globe = ({ selectedA, setSelectedA, selectedB, setSelectedB, selectedYear, setSelectedYear, setTradeData }) => {
    const [countries, setCountries] = useState([]);
    const svgRef = useRef(null);
    const projectionRef = useRef(null);
    const selectedRef = useRef({ selectedA: null, selectedB: null });

    const { tradeDataRef, centroidMapRef } = useTradeData(setTradeData);

    const redrawTradeConnections = useCallback((svg, projection) => {
        const { selectedA, selectedB } = selectedRef.current;
        const trade = tradeDataRef.current;
        const centroidMap = centroidMapRef.current;

        svg.selectAll('.trade-connection').remove();
        svg.selectAll('.defs').remove();

        if (selectedA && selectedB) {
            let dataAB = [];
            let dataBA = [];
            if (selectedB === 'World') {
                dataAB = trade.filter(d => d.reference_area === selectedA && selectedYear === d.TIME_PERIOD);
                dataBA = trade.filter(d => d.counterpart_area === selectedA && selectedYear === d.TIME_PERIOD);
            } else {
                dataAB = trade.filter(d => d.reference_area === selectedA && d.counterpart_area === selectedB && selectedYear === d.TIME_PERIOD);
                dataBA = trade.filter(d => d.reference_area === selectedB && d.counterpart_area === selectedA && selectedYear === d.TIME_PERIOD);
            }

            const tooltip = d3.select('#tooltip');

            const drawLine = (source, target, offset) => {
                if (!source || !target) return null;

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
                const maxTradeValue = d3.max(data, d => d.OBS_VALUE);
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

                        const lineLength = Math.sqrt(Math.pow(target[0] - source[0], 2) + Math.pow(target[1] - source[1], 2));
                        const shortenFactor = 10 / lineLength;
                        const shortenedTarget = [
                            target[0] - (target[0] - source[0]) * shortenFactor,
                            target[1] - (target[1] - source[1]) * shortenFactor
                        ];

                        return drawLine(source, shortenedTarget, offset);
                    })
                    .style('fill', 'none')
                    .style('stroke', color)
                    .style('stroke-width', d => width(d.OBS_VALUE))
                    .style('stroke-linecap', 'round')
                    .attr('marker-end', 'url(#arrow' + offset + ')')
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

            drawTradeConnections(dataAB, 'var(--export)', 50);
            drawTradeConnections(dataBA, 'var(--import)', -50);
        }
    }, [selectedYear, tradeDataRef, centroidMapRef]);

    useGlobe(svgRef, projectionRef, selectedRef, redrawTradeConnections);

    useEffect(() => {
        if (!svgRef.current || !svgRef.current.paths) return;

        svgRef.current.paths.style('fill', (d) => {
            if (d.properties.name === selectedA) return "var(--export)";
            if (d.properties.name === selectedB) return "var(--secondary)";
            if (selectedB === 'World') {
                const trade = tradeDataRef.current;
                const tradeData = trade.filter(d => d.counterpart_area === selectedA && selectedYear === d.TIME_PERIOD);
                const countries = tradeData.map(d => d.reference_area);
                if (countries.includes(d.properties.name)) return "var(--secondary)";
            }
            return checkTradeData(tradeDataRef.current, d.properties.name) ? "var(--earth)" : "var(--gray)";
        });

        const svg = svgRef.current;
        const projection = projectionRef.current;
        selectedRef.current = { selectedA, selectedB };

        redrawTradeConnections(svg, projection);
    }, [selectedA, selectedB, selectedYear, redrawTradeConnections]);

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
                        onChange={(e) => setSelectedYear(e.target.value)}
                        style={{ width: '100%' }}
                    />
                    <label>Year: {selectedYear}</label>
                </form>
            </div>
        </div>
    );
};

export default Globe;
