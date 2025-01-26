import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const BidirectionalBarChart = ({ selectedA, selectedB, selectedYear, tradeData }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        console.log('BidirectionalBarChart selectedA:', selectedA);
        console.log('BidirectionalBarChart selectedB:', selectedB);
        console.log('BidirectionalBarChart selectedYear:', selectedYear);
        console.log('BidirectionalBarChart tradeData:', tradeData);

        // Clear previous chart
        const svg = d3.select(svgRef.current);
        // if the svg is not empty, remove all elements
        if (!svg.empty())
            console.log('svg is not empty');
        svg.selectAll('*').remove();

        // Dimensions
        const width = 700;
        const height = 400;
        const margin = { top: 20, right: 20, bottom: 20, left: 80 };
        const chartHeight = height - margin.top - margin.bottom;
        const chartWidth = width - margin.left - margin.right;

        // SVG setup
        svg.attr('width', width).attr('height', height);

        const chartGroup = svg
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Filter data
        let dataAB = [];
        let dataBA = [];
        if (selectedB === 'World') {
            // Sum export over all countries with selected reference country
            dataAB = tradeData.filter(
                d => d.reference_area === selectedA && d.MEASURE === 'EXGR'
            ).reduce((acc, curr) => {
                const existing = acc.find(d => d.TIME_PERIOD === curr.TIME_PERIOD);
                if (existing) {
                    existing.OBS_VALUE += curr.OBS_VALUE;
                } else {
                    acc.push({ ...curr });
                }
                return acc;
            }, []);

            // Sum import over all countries with selected reference country
            dataBA = tradeData.filter(
                d => d.reference_area === selectedA && d.MEASURE === 'IMGR'
            ).reduce((acc, curr) => {
                const existing = acc.find(d => d.TIME_PERIOD === curr.TIME_PERIOD);
                if (existing) {
                    existing.OBS_VALUE += curr.OBS_VALUE;
                } else {
                    acc.push({ ...curr });
                }
                return acc;
            }, []);
        } else {
            dataAB = tradeData.filter(
                d => d.reference_area === selectedA && d.counterpart_area === selectedB && d.MEASURE === 'EXGR'
            );
            dataBA = tradeData.filter(
                d => d.reference_area === selectedA && d.counterpart_area === selectedB && d.MEASURE === 'IMGR'
            );
        }

        console.log('Data for A -> B:', dataAB);
        console.log('Data for B -> A:', dataBA);

        // Scales
        const xScale = d3.scaleBand()
            .domain(dataAB.map(d => d.TIME_PERIOD))
            .range([0, chartWidth])
            .padding(0.2);

        const max = d3.max([...dataAB, ...dataBA], d => d.OBS_VALUE);

        const yScale = d3.scaleLinear()
            .domain([0, max])
            .range([chartHeight / 2, 0]);

        const yScaleNegative = d3.scaleLinear()
            .domain([0, max])
            .range([0, chartHeight / 2]);


        // Add horizontal divider
        chartGroup.append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', chartHeight / 2)
            .attr('y2', chartHeight / 2)
            .attr('stroke', 'black')
            .attr('stroke-width', 1);

        // Bars for A -> B
        chartGroup.selectAll('.bar-ab')
            .data(dataAB)
            .enter()
            .append('rect')
            .attr('class', 'bar-ab')
            .attr('x', d => xScale(d.TIME_PERIOD))
            .attr('y', d => yScale(d.OBS_VALUE))
            .attr('width', xScale.bandwidth())
            .attr('height', d => chartHeight / 2 - yScale(d.OBS_VALUE))
            .attr('fill', 'var(--export)')
            .attr('opacity', d => d.TIME_PERIOD === selectedYear ? 1 : 0.5);

        // Bars for B -> A
        chartGroup.selectAll('.bar-ba')
            .data(dataBA)
            .enter()
            .append('rect')
            .attr('class', 'bar-ba')
            .attr('x', d => xScale(d.TIME_PERIOD))
            .attr('y', chartHeight / 2)
            .attr('width', xScale.bandwidth())
            .attr('height', d => yScaleNegative(d.OBS_VALUE))
            .attr('fill', 'var(--import)')
            .attr('opacity', d => d.TIME_PERIOD === selectedYear ? 1 : 0.5);

        // Axes
        const xAxis = d3.axisBottom(xScale).tickFormat(d => d);
        const yAxis = d3.axisLeft(yScale);

        chartGroup.append('g')
            .attr('transform', `translate(0,${chartHeight / 2})`)
            .call(xAxis)
            .selectAll('text') // Select all x-axis tick text
            .attr('transform', 'rotate(-90)') // Rotate 90 degrees
            .style('text-anchor', 'start') // Adjust anchor for readability
            .attr('dx', '-3em') // Fine-tune horizontal positioning
            .attr('dy', '-0.5em'); // Fine-tune vertical positioning

        // Add y-axis for A -> B and B -> A
        chartGroup.append('g').call(yAxis);
        chartGroup.append('g').call(yAxis.scale(yScaleNegative)).attr('transform', `translate(0,${chartHeight / 2})`);

        // Export label
        chartGroup.append('text')
            .attr('x', -chartHeight / 4)
            .attr('y', -60)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Export (Mil.$)')
            .style('font-size', '12px')
            .style('fill', 'white');

        // Import label
        chartGroup.append('text')
            .attr('x', -chartHeight / 4 * 3)
            .attr('y', -60)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Import (Mil.$)')
            .style('font-size', '12px')
            .style('fill', 'white');


        chartGroup.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + margin.bottom)
            .attr('text-anchor', 'middle')
            .text('Year')
            .style('font-size', '12px')
            .style('fill', 'white');


    }, [selectedA, selectedB, selectedYear, tradeData]);

    return (
        <svg ref={svgRef}></svg>
    );
};

export default BidirectionalBarChart;
