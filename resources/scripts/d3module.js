/**
 * D3 Module
 * Creates a visualization from the CSV data
 *
 * @author Ashiqur Rahman
 * @author_url http://ashiqur.com
 **/

import * as d3 from "https://cdn.skypack.dev/d3@7";

// Define the global variables for the visualization
let cars, x_variable = 'MPG', y_variable = 'Horsepower', cars_color, attributes, axis_keys;
// Default values for the filters
let default_filter = {
    'Model': false,
    'Origin': false,
    'MPG': false,
    'Cylinders': false,
    'Displacement': false,
    'Horsepower': false,
    'Weight': false,
    'Acceleration': false,
    'Year': false
}
// Active filters at any point of time
let active_filter = {...default_filter};

/**
 * Window is ready, let's go...
 */
window.onload = function () {
    load_data();
};

/**
 * Load the data from the CSV file
 * @param type
 */
function load_data(type) {
    Promise.all([d3.csv("resources/data/cars_dataset_with_cluster.csv")]).then(createVisualization)
}

/**
 * Function to create the visualization
 * This function cleans up the data, creates the dropdowns for the axis, color legends and hands over the data to the draw function
 * @param data array of CSV data elements
 */
function createVisualization(data) {

    // Prepare the vehicle data and convert the types for visualization
    cars = data[0].map((d) => {
        return {
            'Model': d.Model.trim(),
            'MPG': parseFloat(d.MPG.trim()),
            'Cylinders': parseInt(d.Cylinders.trim()),
            'Displacement': parseFloat(d.Displacement.trim()),
            'Horsepower': parseFloat(d.Horsepower.trim()),
            'Weight': parseInt(d.Weight.trim()),
            'Acceleration': parseFloat(d.Acceleration.trim()),
            'Year': parseInt('19' + d.Year.trim()),
            'Origin': d.Origin.trim(),
            'Cluster': parseInt(d.Cluster.trim())
        }
    });

    // Attributes of the SVG visualization
    attributes = {
        width_cars: 600,
        height_cars: 550,
        margin: {
            top: 20,
            right: 20,
            bottom: 50,
            left: 20
        },
        axis: {
            x: 50,
            y: 50
        }
    };

    // Select the numeric axis keys for comparison
    axis_keys = Object.keys(cars[0]).filter(k => {
        return (k !== 'Model' && k !== 'Origin' && k !== 'Cluster');
    });

    // Create the X axis options
    d3.select('#x-axis-variable')
        .append('select')
        .attr('id', 'x-variable')
        .attr('class', 'axis-variable-select w-100')
        .on('change', handleXAxisChange)
        .selectAll('option')
        .data(axis_keys)
        .join('option')
        .text(d => d)
        .attr('selected', d => (d === x_variable ? 'selected' : null));

    // Create the Y axis options
    d3.select('#y-axis-variable')
        .append('select')
        .attr('id', 'y-variable')
        .attr('class', 'axis-variable-select w-100')
        .on('change', handleYAxisChange)
        .selectAll('option')
        .data(axis_keys)
        .join('option')
        .text(d => d)
        .attr('selected', d => (d === y_variable ? 'selected' : null));

    // Handle the checkbox for clustering
    d3.select('#cluster-checkbox')
        .on('change', handleClusterChange);

    // Populate datalist for car models
    let car_models = [...new Set(d3.group(cars, d => d.Model).keys())];
    d3.select('#car-models')
        .selectAll('option')
        .data(car_models)
        .join('option')
        .attr('value', d => d)
        .attr('data-key', d => d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'));
    d3.select('#filter-car-models')
        .on('change', handleCarModelFilter);

    // Color Schemes

    // Default colors for all the cars based on origin
    const cars_color_scheme = d3.scaleOrdinal()
        .domain(d3.group(cars, d => d.Origin).keys())
        .range(d3.schemeSet2);

    // Default colors for all the clusters
    const cars_cluster_scheme = d3.scaleOrdinal()
        .domain(d3.group(cars, d => d.Cluster).keys())
        .range(d3.schemeTableau10);

    // Check if the data is within current month
    // Then either show the data point in color or in gray
    cars_color = function (d) {
        return (d3.select('#cluster-checkbox').property('checked') ? cars_cluster_scheme(d.Cluster) : cars_color_scheme(d.Origin));
    };

    // Draw color legends
    draw_color_legends(cars_color_scheme, cars_cluster_scheme);

    // Draw the visualization
    draw_cars_visualization();
}

/**
 * Function to draw the color legends
 * @param cars_color_scheme
 */
function draw_color_legends(cars_color_scheme, cars_cluster_scheme) {
    // Add color legends
    let legend_svg = d3.selectAll('#cars-color-legends').append('svg')
        .attr('width', 150)
        .attr('height', 60)
        .attr('class', 'color-legend');

    legend_svg.selectAll('rect')
        .data(cars_color_scheme.domain())
        .join('rect')
        .attr('class', 'legend-color')
        .attr('width', 10)
        .attr('height', 10)
        .attr('x', 10)
        .attr('y', (d, i) => (20 * i))
        .attr('fill', d => cars_color_scheme(d));

    legend_svg.selectAll('text')
        .data(cars_color_scheme.domain())
        .join('text')
        .attr('x', 30)
        .attr('dx', 0)
        .attr('y', (d, i) => (20 * i) + 12)
        .text(d => d);

    // Add cluster legends
    let cluster_legend_svg = d3.selectAll('#cluster-legends').append('svg')
        .attr('width', 150)
        .attr('height', 250)
        .attr('class', 'color-legend');

    cluster_legend_svg.selectAll('rect')
        .data(cars_cluster_scheme.domain().sort((a, b) => a - b))
        .join('rect')
        .attr('class', 'legend-color')
        .attr('width', 10)
        .attr('height', 10)
        .attr('x', 10)
        .attr('y', (d, i) => (20 * i))
        .attr('fill', d => cars_cluster_scheme(d));

    cluster_legend_svg.selectAll('text')
        .data(cars_cluster_scheme.domain().sort((a, b) => a - b))
        .join('text')
        .attr('x', 30)
        .attr('dx', 0)
        .attr('y', (d, i) => (20 * i) + 12)
        .text(d => {
            return (d === -1 ? 'Outlier' : 'Cluster ' + (d + 1));
        });
}

/**
 * Function to draw the scatter plot.
 * The function first filters the data based on the active filters and then draws the visualization.
 */
function draw_cars_visualization() {

    // Not all attributes are active for filtering. We need to select only the active ones.
    let keys_to_filter = Object.keys(active_filter).filter(k => (k !== 'Model' && active_filter[k] !== false));

    // Filter the data based on the active filters
    let filtered_cars = [];
    cars.forEach((d, i) => {
        let mismatch = 0;
        keys_to_filter.forEach((k) => {
            if (k === 'Origin') {
                if (d[k] !== active_filter[k]) {
                    mismatch++;
                }
            } else {
                const operation = d3.select('#filter-type').node().value;
                if (operation === 'equal') {
                    if (d[k] !== active_filter[k]) {
                        mismatch++;
                    }
                } else if (operation === 'down') {
                    if (d[k] > active_filter[k]) {
                        mismatch++;
                    }
                } else {
                    if (d[k] < active_filter[k]) {
                        mismatch++;
                    }
                }
            }
        });
        if (mismatch === 0) {
            filtered_cars.push(d);
        }
    });

    // Create the SVG canvas
    let cars_svg = d3.selectAll('#cars-visualization')
        .append('svg')
        .attr('width', attributes.width_cars)
        .attr('height', attributes.height_cars)
        .attr('viewBox', [0, 0, attributes.width_cars, attributes.height_cars])
        .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // X axis
    let cars_x_domains = [...new Set(cars.map(d => d[x_variable]))];
    let cars_x_scale = d3.scaleLinear()
        .domain(d3.extent(cars_x_domains))
        .range([attributes.axis.y + 10, attributes.width_cars - 10])
        .nice();

    const cars_x_axis = d3.axisBottom(cars_x_scale);

    cars_svg.append('g')
        .attr('class', 'x axis')
        .call(cars_x_axis)
        .attr('transform', 'translate(0, ' + (attributes.height_cars - attributes.axis.x) + ')')
        .selectAll('text')
        .attr('y', 0)
        .attr('x', -15)
        .attr('dy', '.35em')
        .attr('transform', 'rotate(270)')
        .style('text-anchor', 'end');

    cars_svg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", attributes.width_cars)
        .attr("y", attributes.height_cars - 6)
        .text(x_variable);

    // Y axis
    let cars_y_domains = [...new Set(cars.map(d => d[y_variable]))];
    let cars_y_scale = d3.scaleLinear()
        .domain([(d3.extent(cars_y_domains)[0] - 1), (d3.extent(cars_y_domains)[1] + 1)].reverse())
        .range([10, attributes.height_cars - attributes.axis.x])
        .nice();

    const cars_y_axis = d3.axisLeft(cars_y_scale);

    cars_svg.append('g')
        .call(cars_y_axis)
        .attr('class', 'y axis')
        .attr('transform', 'translate(' + attributes.axis.x + ', 0)')
        .selectAll('text')
        .style('text-anchor', 'end');

    cars_svg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", 6)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text(y_variable);

    // Transition
    const t = cars_svg.transition().duration(750);

    // Draw the bubbles
    cars_svg.append('g')
        .selectAll('.bubble')
        .data(filtered_cars)
        .join('circle')
        .attr('class', d => 'bubble bubble-' + d.Origin.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' ' + d.Model.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' cluster-' + d.Cluster)
        .on('mouseover', handleMouseOverBubble)
        .on('mouseout', handleMouseOutBubble)
        .on('click', handleMouseClickBubble)
        .attr('cx', d => cars_x_scale(d[x_variable]))
        .attr('cy', d => cars_y_scale(d[y_variable]))
        .attr('r', 5)
        .attr('opacity', 0.7)
        .style('fill', d => cars_color(d))
        .transition(t)
        .attr('data-model', d => d.Model.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .attr('data-origin', d => d.Origin.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
        .attr('data-cluster', d => d.Cluster)
        .attr(axis_keys.reduce(function (result, attr) {
            result[attr] = function (d) {
                return attr in d ? d[attr] : null;
            }
            return result;
        }, {}));
}

/**
 * Handle the change of the X axis variable.
 */
function handleXAxisChange() {
    const selected_element = d3.select('#x-variable');
    x_variable = selected_element.node().value;
    redraw_visualization();
}

/**
 * Handle the change of the Y axis variable.
 */
function handleYAxisChange() {
    const selected_element = d3.select('#y-variable');
    y_variable = selected_element.node().value;
    redraw_visualization();
}

/**
 * Handle the change of the cluster variable.
 */
function handleClusterChange() {
    const selected_element = d3.select('#cluster-checkbox');
    if(selected_element.property('checked')) {
        // Show the cluster legends when the checkbox is checked
        d3.select('#cluster-legends')
            .classed('d-none', false);
    } else {
        // Hide the cluster legends when the checkbox is unchecked
        d3.select('#cluster-legends')
            .classed('d-none', true);
    }
    // Redraw the visualization
    redraw_visualization();
}

/**
 * Handle the mouse over event on a bubble.
 * @param d
 * @param i
 */
function handleMouseOverBubble(d, i) {
    const cars_svg = d3.selectAll('#cars-visualization').select('svg');

    // Dim all bubbles
    d3.selectAll('.bubble')
        .style('opacity', 0.3);

    // Highlight the whole cluster when the cluster checkbox is checked
    if (d3.select('#cluster-checkbox').property('checked')) {
        d3.selectAll('.bubble.cluster-' + i.Cluster)
            .style('opacity', 1)
            .raise();
    }
    // Highlight the current bubble
    d3.select(d.target)
        .style('opacity', 1)
        .attr('r', 7)
        .style('stroke-width', '1px')
        .style('stroke', 'white')
        .raise();

    // Show the tooltip
    const text_node = cars_svg
        .append('g')
        .attr('class', 'car-tooltip')
        .append("text")
        .attr('x', (attributes.width_cars - 200))
        .attr('dx', 0)
        .attr('y', 20);
    text_node.append('tspan')
        .attr('x', (attributes.width_cars - 200))
        .attr('dy', '1.2em')
        .text(i.Model + ' (' + i.Year + ')' + ' - ' + i.Origin);
    text_node.append('tspan')
        .attr('x', (attributes.width_cars - 200))
        .attr('dy', '1.2em')
        .text('MPG: ' + i.MPG);
    text_node.append('tspan')
        .attr('x', (attributes.width_cars - 200))
        .attr('dy', '1.2em')
        .text('Cylinders: ' + i.Cylinders);
    text_node.append('tspan')
        .attr('x', (attributes.width_cars - 200))
        .attr('dy', '1.2em')
        .text('Displacement: ' + i.Displacement);
    text_node.append('tspan')
        .attr('x', (attributes.width_cars - 200))
        .attr('dy', '1.2em')
        .text('Horsepower: ' + i.Horsepower);
    text_node.append('tspan')
        .attr('x', (attributes.width_cars - 200))
        .attr('dy', '1.2em')
        .text('Weight: ' + i.Weight);
    text_node.append('tspan')
        .attr('x', (attributes.width_cars - 200))
        .attr('dy', '1.2em')
        .text('Acceleration: ' + i.Acceleration);
    text_node.append('tspan')
        .attr('x', (attributes.width_cars - 200))
        .attr('dy', '1.2em')
        .text('Cluster: ' + (i.Cluster === -1 ? 'Outlier' : i.Cluster + 1));
}

/**
 * Handle the mouse out event on a bubble.
 * @param d
 * @param i
 */
function handleMouseOutBubble(d, i) {
    // Reset the bubbles
    d3.selectAll('.bubble')
        .style('opacity', 0.7)
        .attr('r', 5)
        .style('stroke-width', '0px');

    // Remove the tooltip
    d3.selectAll('.car-tooltip').remove();
}

/**
 * Handle the mouse click event on a bubble.
 * @param d
 * @param i
 */
function handleMouseClickBubble(d, i) {
    // Update the active filter
    active_filter = {...i};
    // Populate the filter input field
    d3.select('#filter-car-models').node().value = i.Model;
    // Filter the visualization
    filterChart(active_filter);
}

/**
 * Filter the chart based on the active filter.
 * @param active_filter
 */
function filterChart(active_filter) {
    let filter_count = 0;
    // Show the active filters as badges and update the filter count
    d3.select('#active-filters').html('');
    Object.keys(active_filter).forEach((d, index) => {
        if (d !== 'Model' && active_filter[d] !== false) {
            d3.select('#active-filters')
                .append('div')
                .attr('class', 'filter badge filter-' + d.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
                .attr('data-filter', d)
                .html('<span class="filter-label">' + d + ': </span><span class="filter-value">' + active_filter[d] + '</span> <span class="filter-close">&times;</span>');
            filter_count++;
        }
    });

    // Show the filter type dropdown if there are active filters
    if (filter_count > 0) {
        d3.select('#filter-type')
            .classed('d-none', false)
            .on('change', handleFilterOperationChange);
    } else {
        d3.select('#filter-type')
            .classed('d-none', true);
        resetFilter();
    }

    // Update the visualization
    redraw_visualization();

    // Add the click event to the active filters
    d3.select('#active-filters')
        .selectAll('.filter')
        .on('click', removeFilter);
}

/**
 * Remove a filter attribute from the active filter when clicked on the badge.
 * @param event
 */
function removeFilter(event) {
    // Check if the click target is the close button
    if (event.target.className === 'filter-close') {
        let filter_item = d3.select(this).attr('data-filter');
        active_filter[filter_item] = false;
        filterChart(active_filter);
    }
}

/**
 * Highlight the vehicle when the filter input field is changed.
 */
function handleCarModelFilter() {
    const selected_element = d3.select('#filter-car-models');
    const selected_car_model = selected_element.node().value;
    if (selected_car_model.length === 0) {
        // Reset the bubbles
        d3.select('#cars-visualization')
            .selectAll('.bubble')
            .attr('r', 5)
            .attr('opacity', 0.7);
    } else {
        // Highlight the selected bubble by increasing the radius and opacity and dimming the rest
        d3.select('#cars-visualization')
            .selectAll('.bubble')
            .attr('r', 3)
            .attr('opacity', 0.3);
        d3.select('#cars-visualization')
            .selectAll('.bubble.' + selected_car_model.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
            .attr('r', 9)
            .attr('opacity', 1)
            .raise();
    }
}

/**
 * Handle the change event on the filter type dropdown.
 */
function handleFilterOperationChange() {
    filterChart(active_filter);
}

/**
 * Reset the filter when all the filter attributes are removed.
 */
function resetFilter() {
    active_filter = {...default_filter};
    d3.select('#filter-car-models').node().value = '';
    redraw_visualization();
}

/**
 * Clear the visualization.
 */
function clean_slate() {
    d3.select('#cars-visualization').html('');
}

/**
 * Redraw the visualization.
 */
function redraw_visualization() {
    if (x_variable !== y_variable) {
        clean_slate();
        draw_cars_visualization();
    }
}
