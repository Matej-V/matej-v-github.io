import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa';

const BidirectionalBarChart = ({ selectedA, selectedB, selectedYear, setSelectedYear, tradeData }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        console.log('BidirectionalBarChart selectedA:', selectedA);
        console.log('BidirectionalBarChart selectedB:', selectedB);
        console.log('BidirectionalBarChart selectedYear:', selectedYear);
        console.log('BidirectionalBarChart tradeData:', tradeData);

        // Clear previous chart
        const svg = d3.select(svgRef.current);

        svg.selectAll('*').remove();

        // Dimensions
        const width = 800;
        const height = 300;
        const margin = { top: 10, right: 10, bottom: 10, left: 70 };
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
        dataAB = tradeData.filter(
            d => d.reference_area === selectedA && d.counterpart_area === selectedB
        );
        if (selectedB === 'World') {
            // Sum export over all countries with selected reference country
            dataBA = d3.rollups(
                tradeData.filter(d => d.counterpart_area === selectedA),
                v => d3.sum(v, d => d.OBS_VALUE),
                d => d.TIME_PERIOD
            ).map(([TIME_PERIOD, OBS_VALUE]) => ({ TIME_PERIOD, OBS_VALUE }));
        } else {
            dataBA = tradeData.filter(
                d => d.reference_area === selectedB && d.counterpart_area === selectedA
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
            // Set class for each bar to be able to select it later
            .attr('class', d => `bar-ab-${d.TIME_PERIOD}`)
            .attr('x', d => xScale(d.TIME_PERIOD))
            .attr('y', d => yScale(d.OBS_VALUE))
            .attr('width', xScale.bandwidth())
            .attr('height', d => chartHeight / 2 - yScale(d.OBS_VALUE))
            .attr('fill', 'var(--export)')
            .attr('opacity', d => d.TIME_PERIOD === selectedYear ? 1 : 0.5)
            .on('click', (event, d) => {
                setSelectedYear(d.TIME_PERIOD);
            })
            .on('mouseover', function (event, d) {
                d3.selectAll(`.bar-ab-${d.TIME_PERIOD}`).attr('opacity', 1);
                d3.selectAll(`.bar-ba-${d.TIME_PERIOD}`).attr('opacity', 1);
            })
            .on('mouseout', (event, d) => {
                // Set opacity back to 0.5 if year is not selected for both A -> B and B -> A
                if (d.TIME_PERIOD !== selectedYear) {
                    d3.selectAll(`.bar-ab-${d.TIME_PERIOD}`).attr('opacity', 0.5);
                    d3.selectAll(`.bar-ba-${d.TIME_PERIOD}`).attr('opacity', 0.5);
                }
            });


        // Bars for B -> A
        chartGroup.selectAll('.bar-ba')
            .data(dataBA)
            .enter()
            .append('rect')
            .attr('class', d => `bar-ba-${d.TIME_PERIOD}`)
            .attr('x', d => xScale(d.TIME_PERIOD))
            .attr('y', chartHeight / 2)
            .attr('width', xScale.bandwidth())
            .attr('height', d => yScaleNegative(d.OBS_VALUE))
            .attr('fill', 'var(--import)')
            .attr('opacity', d => d.TIME_PERIOD === selectedYear ? 1 : 0.5)
            .on('click', (event, d) => {
                setSelectedYear(d.TIME_PERIOD);
            })
            .on('mouseover', function (event, d) {
                d3.selectAll(`.bar-ab-${d.TIME_PERIOD}`).attr('opacity', 1);
                d3.selectAll(`.bar-ba-${d.TIME_PERIOD}`).attr('opacity', 1);
            })
            .on('mouseout', (event, d) => {
                // Set opacity back to 0.5 if year is not selected for both A -> B and B -> A
                if (d.TIME_PERIOD !== selectedYear) {
                    d3.selectAll(`.bar-ab-${d.TIME_PERIOD}`).attr('opacity', 0.5);
                    d3.selectAll(`.bar-ba-${d.TIME_PERIOD}`).attr('opacity', 0.5);
                }
            });
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
            .attr('dy', '-0.5em') // Fine-tune vertical positioning
            .style('pointer-events', 'none'); // Make x-axis text not clickable and transparent for cursor

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-evenly', height: '100%' }}>
            <h3>Export and import <div style={{ display: 'inline-flex' }}><span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>{selectedA}<FaArrowRight style={{ position: 'relative', right: '-13', bottom: '-6' }} /> </span><span style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center' }}><FaArrowLeft style={{ position: 'relative', left: '-13', top: '-6' }} /> {selectedB}</span></div></h3>
            <svg ref={svgRef}></svg>
        </div >

    );
};

export default BidirectionalBarChart;
