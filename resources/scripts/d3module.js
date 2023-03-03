import * as d3 from "https://cdn.skypack.dev/d3@7";

window.onload = function () {
    load_data();
};

function load_data(type) {
    Promise.all([d3.csv("resources/data/cars_dataset.csv")]).then(createVisualization)
}

// Define the global variables for the visualization
let cars, x_variable = 'MPG', y_variable = 'Cylinders', cars_color, attributes, axis_keys;
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

let active_filter = {...default_filter};

/**
 * Function to create the visualization
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
            'Origin': d.Origin.trim()
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
        return (k !== 'Model' && k !== 'Origin')
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

    // Show gray when filter is active
    const gray_color_scheme = d3.scaleOrdinal()
        .domain(d3.group(cars, d => d.Origin).keys())
        .range(['#eaeaea']);

    // Check if the data is within current month
    // Then either show the data point in color or in gray
    cars_color = function (d) {
        //@ToDo: Check for filters against d
        return cars_color_scheme(d.Origin);
    };

    // Draw color legends
    draw_color_legends(cars_color_scheme);

    // Draw the visualization
    draw_cars_visualization();
}

function draw_color_legends(cars_color_scheme) {
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
}

function draw_cars_visualization() {

    let keys_to_filter = Object.keys(active_filter).filter(k => (k !== 'Model' && active_filter[k] !== false));
    console.log(cars[34]);

    let filtered_cars = [];
    const cars_copy = [...cars];
    cars_copy.forEach((d, i) => {
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

    // Cars SVG
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
        .domain([(d3.extent(cars_y_domains)[0] - 1), (d3.extent(cars_y_domains)[1] + 1)])
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

    cars_svg.append('g')
        .selectAll('.bubble')
        .data(filtered_cars)
        .join('circle')
        .attr('class', d => 'bubble bubble-' + d.Origin.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') + ' ' + d.Model.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'))
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
        .attr(axis_keys.reduce(function (result, attr) {
            result[attr] = function (d) {
                return attr in d ? d[attr] : null;
            }
            return result;
        }, {}));
}

function handleXAxisChange() {
    const selected_element = d3.select('#x-variable');
    x_variable = selected_element.node().value;
    redraw_visualization();
}

function handleYAxisChange() {
    const selected_element = d3.select('#y-variable');
    y_variable = selected_element.node().value;
    redraw_visualization();
}

function clean_slate() {
    d3.select('#cars-visualization').html('');
}

function handleMouseOverBubble(d, i) {

}

function handleMouseOutBubble(d, i) {

}

function handleMouseClickBubble(d, i) {
    active_filter = {...i};
    d3.select('#filter-car-models').node().value = i.Model;
    filterChart(active_filter);
}

function filterChart(active_filter) {
    let filter_count = 0;
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

    if (filter_count > 0) {
        d3.select('#filter-type')
            .classed('d-none', false)
            .on('change', handleFilterOperationChange);
    } else {
        d3.select('#filter-type')
            .classed('d-none', true);
        resetFilter();
    }

    redraw_visualization();

    d3.select('#active-filters')
        .selectAll('.filter')
        .on('click', removeFilter);
}

function removeFilter(event) {
    if (event.target.className === 'filter-close') {
        let filter_item = d3.select(this).attr('data-filter');
        active_filter[filter_item] = false;
        filterChart(active_filter);
    }
}

function handleCarModelFilter() {
    const selected_element = d3.select('#filter-car-models');
    const selected_car_model = selected_element.node().value;
    console.log(selected_car_model);
    if (selected_car_model.length == 0) {
        d3.select('#cars-visualization')
            .selectAll('.bubble')
            .attr('r', 5)
            .attr('opacity', 0.7);
    } else {
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

function handleFilterOperationChange() {
    filterChart(active_filter);
}

function resetFilter() {
    active_filter = {...default_filter};
    d3.select('#filter-car-models').node().value = '';
    redraw_visualization();
}

function redraw_visualization() {
    if (x_variable !== y_variable) {
        clean_slate();
        draw_cars_visualization();
    }
}