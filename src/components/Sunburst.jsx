import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const Sunburst = ({ selectedA, selectedB, selectedYear }) => {
    const exportSvgRef = useRef(null);
    const importSvgRef = useRef(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        // Load data dynamically based on selected year and countries
        const path = `year/${selectedYear}.csv`;
        d3.csv(path).then(tradeData => {
            let dataAB = tradeData.filter(
                d => d.reference_area === selectedA && d.counterpart_area === selectedB
            );
            let dataBA = [];
            if (selectedB === 'World') {
                // Sum export over all countries with selected reference country
                dataBA = d3.rollups(
                    tradeData.filter(d => d.counterpart_area === selectedA),
                    v => ({
                        OBS_VALUE: d3.sum(v, d => d.OBS_VALUE),
                        super_category: v[0].super_category
                    }),
                    d => d.economic_activity
                ).map(([economic_activity, { OBS_VALUE, super_category }]) => ({ economic_activity, OBS_VALUE, super_category }));
            } else {
                dataBA = tradeData.filter(
                    d => d.reference_area === selectedB && d.counterpart_area === selectedA
                );
            }

            // Process data to fit Sunburst structure
            const hierarchyExportData = buildHierarchy(dataAB);
            const hierarchyImportData = buildHierarchy(dataBA);

            setData({
                export: hierarchyExportData,
                import: hierarchyImportData
            });
        });

        console.log('Sunburst selectedA:', selectedA);
    }, [selectedA, selectedB, selectedYear]);

    useEffect(() => {
        if (!data) return;

        console.log('Sunburst data:', data);

        // Clear previous charts
        const exportSvg = d3.select(exportSvgRef.current);
        exportSvg.selectAll('*').remove();
        const importSvg = d3.select(importSvgRef.current);
        importSvg.selectAll('*').remove();

        // Dimensions
        const width = 300;
        const height = 300;
        const radius = Math.min(width, height) / 2;

        // Create a color scale good for differentiating categories
        // const color = d3.scaleOrdinal()
        //     .range(['#005f73', '#0a9396', '#94d2bd', '#e9d8a6', '#ee9b00', '#ca6702', '#bb3e03', '#ae2012', '#9b2226']);
        //     // Create color scales for export and import

        // Create a partition layout
        const partition = d3.partition()
            .size([2 * Math.PI, radius]);

        // Function to render sunburst chart
        const renderSunburst = (svg, rootData, title) => {
            // Create a root node for data
            const root = d3.hierarchy(rootData)
                .sum(d => d.value)
                .sort((a, b) => b.value - a.value)

            const importColor = d3.scaleOrdinal()
                .range(['#ae2012', '#d00000', '#dc2f02', '#e85d04', '#f48c06', '#faa307', '#ffba08', '#ffcb08']);

            const exportColor = d3.scaleOrdinal()
                .range(['#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8']);

            // Compute the partition layout
            partition(root);

            // Create an arc generator
            const arc = d3.arc()
                .startAngle(d => d.x0)
                .endAngle(d => d.x1)
                .innerRadius(d => d.y0)
                .outerRadius(d => d.y1);

            // Append the SVG element
            svg.attr('width', width)
                .attr('height', height)
                .append('g')
                .attr('transform', `translate(${width / 2},${height / 2})`)
                .selectAll('path')
                .data(root.descendants())
                .enter().append('path')
                .attr('d', arc)
                .style('fill', d => {
                    const depth = d.depth;
                    const color = title === 'Export' ? exportColor : importColor;
                    if (depth === 0) return 'var(--ocean)';
                    if (depth === 1) return color(d.data.name);
                    const baseColor = color(d.ancestors().find(a => a.depth === 1)?.data.name || d.data.name);
                    // Create new scale for the color or element in the same depth
                    // number of elements in the same depth
                    const n = d.parent.children.length;
                    // index of the element in the same depth
                    const i = d.parent.children.indexOf(d);

                    // Create a scale for the shade of the color
                    const shadeScale = d3.scaleLinear()
                        .domain([0, 5])
                        .range([0, 1]);
                    return d3.color(baseColor).darker(shadeScale(i));
                })
                .on('mouseover', function (event, d) {
                    d3.select(this).style('opacity', 0.7);
                })
                .on('mouseout', function (event, d) {
                    d3.select(this).style('opacity', 1);
                })
                .append('title')
                .text(d => `${d.data.name}\n${d.value.toFixed(2)} Mil. $`);

            // Add text in the middle of the sunburst chart
            svg.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', width / 2 + 5)
                .attr('dx', height / 2)
                .style('font-size', '1rem')
                .style('fill', 'white')
                .style('pointer-events', 'none') // Make x-axis text not clickable and transparent for cursor
                .text(title);
        };

        // Render export sunburst
        renderSunburst(exportSvg, data.export, 'Export');

        // Render import sunburst
        renderSunburst(importSvg, data.import, 'Import');

    }, [data]);

    const buildHierarchy = (dataAB) => {
        // Create a hierarchy structure with the name of the country as the root and the sum of exports as the value
        // Each child of the root is a super_category and each child of a super_category is in column economic_activity
        // The value of each super_category is the sum of the values of its children
        const hierarchyData = {
            name: selectedA,
            children: []
        };

        const superCategories = Array.from(new Set(dataAB.map(d => d.super_category)));
        superCategories.forEach(superCategory => {
            const superCategoryData = {
                name: superCategory,
                children: dataAB
                    .filter(d => d.super_category === superCategory)
                    .map(d => ({
                        name: d.economic_activity,
                        value: +d.OBS_VALUE
                    }))
            };
            hierarchyData.children.push(superCategoryData);
        });

        return hierarchyData;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', height: '100%' }}>
            <div>
                <h3>Export from <span style={{ color: 'var(--primary)' }}>{selectedA}</span> to <span style={{ color: 'var(--secondary)' }}>{selectedB}</span> by economic activity</h3>
            </div>
            <svg ref={exportSvgRef}></svg>
            <div>
                <h3>Import to <span style={{ color: 'var(--primary)' }}>{selectedA}</span> from <span style={{ color: 'var(--secondary)' }}>{selectedB}</span> by economic activity</h3>
            </div>
            <svg ref={importSvgRef}></svg>
        </div>
    );
};

export default Sunburst;
