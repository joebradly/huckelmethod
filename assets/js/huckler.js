// Huckler 0.2
// by Kim Georg Lind Pedersen


$('#huckler')
	.append($('<div id="huckler_model"  class="huckler_model"></div>'))
	.append($('<div id="huckler_editor" class="huckler_editor"></div>'))
	.append($('<div id="huckler_spectrum" class="huckler_spectrum"></div>'))
	.append($('<div id="huckler_transport" class="huckler_transport"></div>'))


var model = new Model('huckler_model');
model.write("Tap this canvas to draw your model.",2);
var editor = new Editor('huckler_editor');
var spectrum = new Spectrum('huckler_spectrum');
var transport = new Transport('huckler_transport');

//  _  _________   ______   ___    _    ____  ____  
// | |/ / ____\ \ / / __ ) / _ \  / \  |  _ \|  _ \ 
// | ' /|  _|  \ V /|  _ \| | | |/ _ \ | |_) | | | |
// | . \| |___  | | | |_) | |_| / ___ \|  _ <| |_| |
// |_|\_\_____| |_| |____/ \___/_/   \_\_| \_\____/ 

// Handling keypresses

function keydown(e) {
    e = e || window.event;

    if (e.keyCode==65 || e.keyCode==69) { // a or e
		//model.draw.reset();
		model.draw.toggle();
    }
    if (e.keyCode==38) { // up
		spectrum.selectNext(+1);
		e.preventDefault();
    }
    if (e.keyCode==40) { // down
		spectrum.selectNext(-1);
		e.preventDefault();
    }
    if (e.keyCode==8) { // backspace
    	var isinput = $(document.activeElement).is('input');
		if (model.selected!==false && !isinput) {
			$('#delete').trigger('click');
		}
		if (!isinput) {
			e.preventDefault();
		}
    }

    console.log(e.keyCode);
}

function keyup(e) {
	// e = e || window.event;

 //    if (e.keyCode==16) {
	// 	model.draw.reset();
 //    }
}

document.onkeydown = keydown;
document.onkeyup = keyup;

// reset
function reset() {
	editor.reset();
	model.reset();
	spectrum.reset();
}


//  _____ ____ ___ _____ ___  ____  
// | ____|  _ \_ _|_   _/ _ \|  _ \ 
// |  _| | | | | |  | || | | | |_) |
// | |___| |_| | |  | || |_| |  _ < 
// |_____|____/___| |_| \___/|_| \_\
                                 
function Editor(container) {

var self = this;

this.container = $('#' + container);
this.setup = {
		'node': 
			{'range': [-10, 10]},
		'link':
			{'range': [-4, 4]}
};


//edit_node
this.edit = function(subject,id) {

	// empty html
	this.reset();

	// build html
	var slider = $('<input type=range min=' + this.setup[subject].range[0] + ' max=' + this.setup[subject].range[1] + ' value=' + model.get(subject,id).weight + ' step=0.05 list="weight_list" />');

	var datalist = $('<datalist id="weight_list"></datalist>');
	for(var i = this.setup[subject].range[0]; i <= this.setup[subject].range[1]; i++) {
		datalist.append($('<option>' + i + '</option>'));
	}

	// var slider = $('<input type="text" data-editor="' + id + '"/>');
	var input = $("<input id='weight' type='text' size=6 value='" + model.get(subject,id).weight + "'/>");
	var remove = $('<a id="delete" class="button" data-editor="' + id + '"> Delete<a/>');

	this.container
		.append(
			$('<h3>Edit ' + subject + '</h3>')
		)
		.append(
			$('<form/>')
				.append('Weight: ').append(slider).append(datalist).append(input).append(remove)
		);
	
	slider = slider
		// .simpleSlider({'range': this.setup[subject].range})
		// .simpleSlider('setValue', model.get(subject,id).weight)
		.on('input change', function (event) {
		
			data = $(this).val();
			if ( Math.abs(input.val() - data) > 0.01)
			{
				input.val(data);
			}
			
			// var id = $(this).attr('data-editor');
			
			model.update(subject,id,data);
		});

	input.bind("input paste", function(event){
		if ($.isNumeric($(this).val())) {
			// console.log($(this).val());
			slider.val(parseFloat($(this).val())).trigger('input');
		}
	});

	remove.on('click',function() {
		model.unselect();
		model.remove(subject,id);
		self.reset();
	});
};

//reset
this.reset = function() {
	this.container.html('');
};

}

//  __  __  ___  ____  _____ _
// |  \/  |/ _ \|  _ \| ____| |
// | |\/| | | | | | | |  _| | |
// | |  | | |_| | |_| | |___| |___
// |_|  |_|\___/|____/|_____|_____|

function Model(container) {

var self = this; // event delegation hack

this.nodes = {}; // list of all nodes
var inode = 0;   // running index
this.links = {}; // list of all links
var ilink = 0;   // running index

var message = false;  // current message
var guide = true;

this.draw = new DrawMode($('#drawmode'));  // are we drawing?
this.diag = new DrawMode($('#diagmode'));  // are we diagonalizing?
this.tran = new DrawMode($('#tranmode'));  // are we calculating resolvents?

this.transport = false; // huh?

this.selected = false;  // which is selected? (link or node)

// Setup drawing stage
var stage = new Kinetic.Stage({
	container: container,
	width: 520,
	height: 405
});

// Add three drawing layers
var eigenLayer = new Kinetic.Layer();
var linkLayer = new Kinetic.Layer();
var nodeLayer = new Kinetic.Layer();

// Add them to the stage
stage.add(linkLayer);
stage.add(nodeLayer);
stage.add(eigenLayer);

// Listen for clicks
stage.getContainer().addEventListener('mousedown', function (e) {
	// clear eigenlayer and update message
	self.clearEigen();

	// Are we drawing or selecting?
	if (self.draw.mode) 
	{   
		// we are drawing -> add node
		self.add_node(e.offsetX | e.layerX, e.offsetY | e.layerY);
	} 
	else if (self.selected !== false) 
	{ 
		// we are selecting -> deselect node
		self.unselect();
	}
});

// Function for writing message to the linkLayer
this.write = function(text, size) {

	console.log('huh:')
	console.log(text)
	if (size==undefined) { size = 1; }

	if (message === false) {
		if (text !== undefined) {
			message = new Kinetic.Text({ // create message
				x: 10,
				y: 10,
				text: text,
				fontSize: 12+4*size,
				fontStyle: 'bold',
				fontFamily: 'Arial',
				fill: '#444444'
			});
			linkLayer.add(message);
		}
	} else {
		if (text === undefined) {
			message.destroy();
			message = false;
		} else {
			message.fontSize(12+4*size).setText(text)
		}
	}

	linkLayer.batchDraw();
};

/////////////////////////////////////////////
// NODES
/////////////////////////////////////////////
// Add node
this.add_node = function(x,y,weight,options)
{
	// Defaults
	if (weight  === undefined) { weight = 0; }
	if (options === undefined) { options = {}; }
	
	// Is it draggable
	var draggable = true;
	if ('draggable' in options) { draggable = options['draggable']; }

	// Choose node color
	var nodeColor = 'gray';
	if (weight < 0) { nodeColor = 'black'; }

	// Create graphical node
	var node = new Kinetic.Circle({
		x: x,
		y: y,
		radius: 14 + Math.abs(weight) * 1.5,
		fill: nodeColor,
		stroke: 'rgb(255,255,255)',
		strokeWidth: 4,
		draggable: draggable,
		name: 'node',
		id: 'node' + inode
	});

	// Append node position to data structure
	self.nodes[node.getId()] = { 'x': x, 'y': y, 'links': Array(), 'weight': weight, 'options' : options };

	// CURSOR
	/////////////////////////////////////////////
	// Update the cursor when hovering
	node.on('mouseover', function(evt) { document.body.style.cursor = 'pointer'; });
	// Switch back to old cursor when not hovering
	node.on('mouseout', function(evt) {
		if (self.draw.mode) {
			document.body.style.cursor = 'copy';
		} else {
			document.body.style.cursor = 'default';
		}
	});

	// SELECTING
	/////////////////////////////////////////////
	// selecting the node
	node.on('mousedown touchstart', function(evt) {
		self.touch_circle(this);
		evt.cancelBubble = true;  // no bubbling
	});

	// DRAG
	// Don't link when dragging
	node.on('dragstart', function() {
		self.unselect(this);
		document.body.style.cursor = 'pointer';
	});

	// Update nodes when dragged
	node.on('dragmove', function(){
		self.nodes[this.getId()].x = this.getX();
		self.nodes[this.getId()].y = this.getY();
		self.update_links(self.nodes[this.getId()].links);
		// self.redraw_node_links(this.getId());
	});

	// DELETE
	// Delete if placed in lower bottom corner
	// node.on('dragend', function(evt) {
	// 	if ( (this.getY() > stage.getHeight() - 35) && (this.getX() > stage.getWidth() - 35 )) {
	// 		self.remove_node(this.getId());
	// 	}
	// 	document.body.style.cursor = 'default';
	// });

	// CLEAN UP
	// Add to nodelayer and draw it
	nodeLayer.add(node);
	inode++;
	nodeLayer.batchDraw();

	// If another node is selected draw a link
	if (self.selected !== false && self.selected.getClassName() == 'Circle') {
		self.add_link(this.selected.getId(),node.getId());
		self.unselect(this.selected);
	}

	// Guide
	if (ilink === 0) { self.write("Select two nodes to add a link between them."); }

	// Select this node
	if (!('electrode' in options) && !('load' in options)) {
		self.touch_circle(node);
	}

	return node.getId();
};

// Touching the node
this.touch_circle = function(elm) {
	// A node is already selected 
	if (this.selected !== false && this.selected.getName() == 'node') {		// selected node
		if (this.selected.getId()==elm.getId()) {
			this.unselect();
		} else {
			// Are the two nodes already linked?
			var test = this.test_link(elm.getId(),this.selected.getId());			// add_link between them. false=same, number=exist ,true=creates
			// No, they are not linked. Add a link
			if (test === false && this.draw.mode) { // no link
				test = this.add_link(elm.getId(),this.selected.getId());
				this.unselect();
			}
			// 
			if (test !== false && test !== true) {
				this.touch_line(linkLayer.get('#' + test)[0]);
			} else {
				this.select(elm);
			}
		}
	} else { // select node
		this.select(elm);
	}
};

// Update the node based on weight
this.update_node = function(nid, weight) {

	if (this.nodes[nid].weight == weight) { return; }

	// update data
	this.nodes[nid].weight = weight;

	// get the node
	var node = nodeLayer.get('#' + nid)[0];
	
	// redraw the node
	node.setRadius(14 + Math.abs(weight) * 1.5);
	if (weight >= 0) {
		node.setFill('gray');
	} else {
		node.setFill('black');
	}

	nodeLayer.batchDraw();

	// reavaluate 
	this.evaluate();
};

// Remove node
this.remove_node = function(nid) {

	iselectrode = this.is_electrode(nid)

	// console
	console.log('remove ' + nid);

	// delete links
    var nodeLinks = self.nodes[nid].links.slice(0);
	for (var i = 0; i < nodeLinks.length; ++i) {
		self.remove_link(nodeLinks[i]);
	}

	// delete node from data structure
	delete self.nodes[nid];

	// remove node from layer
	var node = nodeLayer.get('#' + nid)[0];
	node.destroy();

	// update layer
	nodeLayer.batchDraw();

	// reavaluate 
	if (!iselectrode) {
		this.evaluate();
	}
};

// SPECIAL NODES
/////////////////////////////////////////////
// Electodes
this.add_electrodes = function() {

	var h = stage.getHeight();
	var w = stage.getWidth();

	this.add_node(0,h/2,10,{'electrode': true, 'draggable': false});
	this.add_node(w,h/2,10,{'electrode': true, 'draggable': false});

	console.log('Added electrodes')
};

this.get_electrodes = function() {
	var elec = [];
	for (var n in this.nodes) {
		if (!(this.nodes).hasOwnProperty(n)) { continue; }
		if (this.nodes[n].options['electrode'] === true) {
			elec.push(n);
		}
	}
	return elec;
};

this.remove_electrodes = function() {
	var remove = this.get_electrodes();

	for(var i = 0; i<remove.length; i++) {
		this.remove_node(remove[i]);
	}
};

this.is_electrode = function(n) {
	if ('electrode' in model.nodes[n].options && model.nodes[n].options['electrode'] === true)
		return true;
	else
		return false;
};

/////////////////////////////////////////////
// LINKS
/////////////////////////////////////////////
// Test if there is a link between two nodes
this.test_link = function(nid1,nid2) {

	// same site selected: abort
	if (nid1 == nid2) { return true; }

	// check if link exists:
	for (var i = 0; i < self.nodes[nid1].links.length; i++) {
		lid = self.nodes[nid1].links[i];
		if (self.links[lid].nodes[0] == nid2 || self.links[lid].nodes[1] == nid2) {
			// abort if true and select node instead
			return lid;
		}
	}

	return false;
};

// Add a link between two nodes
this.add_link = function(nid1,nid2,weight) {

	// same site selected: abort
	if (nid1 == nid2) { return true; }

	// link already exists
	if (this.test_link(nid1,nid2)) { return; }

	// strokeColor
	var strokeColor = 'black';
	if (weight === undefined) {
		weight = -1;
		if (weight>=0) {
			strokeColor = 'gray';
		}
	}

	// line
	var line = new Kinetic.Line({
		points: [self.nodes[nid1].x, self.nodes[nid1].y, self.nodes[nid2].x, self.nodes[nid2].y],
		stroke: strokeColor,
		strokeWidth: Math.abs(weight * 7 ),
		name: 'link',
		id: 'link' + ilink
	});

	line.on('mousedown touchstart', function(evt) {
		self.touch_line(this);
		evt.cancelBubble = true;
	} );

	// console
	console.log('added ' + line.getId() + ' between ' + nid1 + ' and ' + nid2);

	// guide text
	if (ilink == 0) { self.write('Tap the Eigenspectrum to show the orbitals'); } // finish guide 

	linkLayer.add(line); // add line to layer
	ilink++; // increment running index

	// Add to links object
	self.links[line.getId()] = {'nodes': [nid1, nid2], 'weight': weight};

	// Add to nodes object
	self.nodes[nid1].links[self.nodes[nid1].links.length] = line.getId();
	self.nodes[nid2].links[self.nodes[nid2].links.length] = line.getId();
	
	// Draw a dashed line to electrodes
	if (this.is_electrode(nid1) || this.is_electrode(nid2)) {
		line.dash([20,10]);
	} 

	// Redraw
	linkLayer.batchDraw();

	// Reevaluate
	this.evaluate();

	return line.getId();
};

// Touching link
this.touch_line = function(elm) {

	if (this.selected !== false) {
		if (elm.getId() == this.selected.getId()) {
			this.unselect(this.selected);
		} else {
			this.unselect(this.selected);
			this.select(elm);
		}
	}
	else if (this.selected === false) {
		this.select(elm);
	}
};

// update link based on weight
this.update_links = function(lids,weight) {
	for(var i = 0; i < lids.length; i ++) {
		this.update_link(lids[i],weight);
	}
	return;
};

// Update the links
this.update_link = function(lid, weight) {

	if (weight===undefined) { // update positions

		var nid1 = self.links[lid].nodes[0];
		var nid2 = self.links[lid].nodes[1];
	
		line = linkLayer.get('#' + lid)[0];
		line.setPoints([self.nodes[nid1].x, self.nodes[nid1].y, self.nodes[nid2].x, self.nodes[nid2].y]);

	} else { // update weight
		if (this.links[lid].weight == weight) {
			return;
		}

		this.links[lid].weight = weight;

		line = linkLayer.get('#' + lid)[0];
		line.setStrokeWidth( Math.abs(weight * 7 ) );
		if (weight >= 0) {
			line.setStroke('gray');
		} else {
			line.setStroke('black');
		}

		this.evaluate();
	}
	linkLayer.batchDraw();
};

// Remove link
this.remove_link = function(lid) {
	// remove line
	this.selected = false;

	var line = linkLayer.get('#' + lid)[0];
	line.destroy();

	console.log('remove ' + lid + ' from ' + this.links[lid].nodes[0] + ' to ' + this.links[lid].nodes[1]);

	for (var i = 0; i < 2; i ++) {
		var nid = this.links[lid].nodes[i];

		var nlinks = this.nodes[nid].links;
		// select index and update array
		var ix = nlinks.indexOf(lid);
		if (ix > -1) { nlinks.splice(ix,1); }

		// update links list
		this.nodes[nid].links = nlinks;
	}

	// remove link
	delete this.links[lid];

	linkLayer.batchDraw();

	// If we are not remove electrodes, then reevaluate
	this.evaluate();
};

// UTILITY
//////////////////////////////////////////////////
// Add link or node
this.add = function(subject,v1,v2,v3) {
	if (subject == 'link') {
		return this.add_link(v1,v2,v3);
	}
	return this.add_node(v1,v2,v3);
};
// Update link or node
this.update = function(subject,id,weight) {
	if (subject == 'link') {
		return this.update_link(id,weight);
	}
	return this.update_node(id,weight);
};
// Select link or node
this.select = function(elm) {

	// Test that elm is selectable
	if (this.selected!==false && this.selected.getId()==elm.getId()) {
		return;
	}

	// Clear the eigenlayer
	this.clearEigen();

	// Unselect anything selected
	this.unselect();

	// Remember selected element
	this.selected = elm;

	this.selected.setStroke('#CC3333'); // select link graphically
	
	if (this.selected.getName()=='link') {
		linkLayer.batchDraw();
		editor.edit('link',elm.getId());
	} else {
		nodeLayer.batchDraw();
		if (!this.is_electrode(elm.getId())) {
			editor.edit('node',elm.getId());
		}
	}
	console.log('selected ' + elm.getId());
};

this.unselect = function() {
	
	if (this.selected===false) { return; }

	editor.reset();

	if (this.selected.getName()=='link') {
		if (this.links[this.selected.getId()].weight <= 0) {
			this.selected.setStroke('black');
		} else {
			this.selected.setStroke('gray');
		}
		linkLayer.batchDraw();
	} else {
		this.selected.setStroke('rgb(255,255,255)'); // deselect graphically
		nodeLayer.batchDraw();
	}

	// this.update(this.selected.getName(),this.selected);
	this.selected = false;
};
// get object 
this.get = function(subject,id) {
	return (subject == 'link' ? this.links[id] : this.nodes[id]); 
};
// remove object
this.remove = function(subject,id) {
	if (subject == 'link') {
		return this.remove_link(id);
	}
	return this.remove_node(id);
};
// reset the stage 
this.reset = function () {
	eigenLayer.destroyChildren().draw();
	linkLayer.destroyChildren().draw();
	nodeLayer.destroyChildren().draw();

	// reset values
	this.nodes = {};
	inode = 0;
	this.links = {};
	ilink = 0;
	this.selected = false;
	message = false;
	guide = true;

	this.draw.reset(); // reset counters
	this.diag.reset(); // reset digaonlization
	this.tran.reset(); // reset digaonlization

	this.remove_electrodes();
	$('#electrodes').html('<b>+</b> Leads').attr('data-mode','add');

	self.write("Tap this canvas to draw your model.",2);
};

// EIGEN
//////////////////////////////////////////////////
// Clear the eigenlayer and update the spectrum
this.clearEigen = function() {
	spectrum.unselect();
	eigenLayer.destroyChildren().draw();
};

// Draw the molecular orbitals
this.drawMO = function(inodes,energy,orbital) {

	// wipe the slate clean
	eigenLayer.destroyChildren();

	var N = orbital.length;

	var sgn = sign(orbital[0]);

	for(var j = 0; j < N; j++) {
		var node = this.nodes[inodes[j]];
		this.drawMOweight(node.x,node.y,sgn*orbital[j]);
	}

	guide = false;
	this.write('Energy: ' + Math.round(energy*1000)/1000);

	eigenLayer.batchDraw();

};

// 
this.drawMOweight = function(x,y,w) {
	
	var fill = 'blue';
	if (w<0) { fill = 'red'; }

	var weight = new Kinetic.Circle({
		x: x,
		y: y,
		radius: Math.abs(w)*42,
		fill: fill,
		draggable: false
	});

	eigenLayer.add(weight);
};

// Evaluate our calculation
this.evaluate = function(loading) {
	if (this.diag.mode) {
		if (guide===false) { this.write(''); } 
		spectrum.diagonalize();
	} else {
		this.clearEigen();
		spectrum.reset();
	}

	if (this.tran.mode) {
		transport.plot();
	} else {
		transport.reset();
	}

	loading = typeof loading !== 'undefined' ? loading : false;

	if (!loading) {
		$('#modellink').html('');
	}
};
// list connections to leads
this.connections = function() {
	// leads
	var L = [];
	var inodes = []; var els = []; 
	for (var n in model.nodes) {
		if (!(model.nodes).hasOwnProperty(n)) {
			continue; //The current property is not a direct property of p
		}
		if (model.nodes[n].links.length > 0) {
			inodes.push(n);
		}
		if (model.is_electrode(n)) {
			els.push(n);
			continue;
		}
	}
	for (var j = 0; j < els.length; j++) { 
		L[j] = [];
		for (var l = 0; l < model.nodes[els[j]].links.length; l++) {
			// this is the link
			var l1 = model.nodes[els[j]].links[l]
			// take the other node
			var i1 = 0; if (model.links[l1].nodes[0]==els[j]) { i1 = 1; } 
			// add our findings to a list
			L[j].push([inodes.indexOf(model.links[l1].nodes[i1]), parseFloat(model.links[l1].weight)]);
		}
	}
	return L;
}
// IO
//////////////////////////////////////////////////
// DUMP function 
this.dump = function() {
	var H = spectrum.hamiltonian(this);
		if (H === false) { return false; }
	var xy = [];
	var L = model.connections();

	for( var i = 0; i < spectrum.inodes.length; i ++) {
		H[i][i] = H[i][i] - spectrum.settings.adhocshift;
		xy[i] = [this.nodes[spectrum.inodes[i]].x, this.nodes[spectrum.inodes[i]].y];
	}
	var json = JSON.stringify({'H': H,'xy': xy,'L':L}, null, null);

	return json;
};
// load a model
this.load = function(H,xy,L) {

	reset();
	spectrum.update = false;

	var nodeNames = [];

	for (var i = 0; i < (xy).length; i++) {
		nodeNames[i] = this.add_node(xy[i][0], xy[i][1], H[i][i], {'load': true});
	}

	for (var i = 0; i < xy.length; i++) {
		for (var j = 0; j < i; j++) {
			if ( H[i][j] !== 0 ) {
				this.add_link(nodeNames[i], nodeNames[j], parseFloat(H[i][j]));
			}
		}
	}

	// if there is leads
	if (L.length > 0) { 
		model.add_electrodes();
		$('#electrodes').html('<b>&ndash;</b> Leads');

		els = model.get_electrodes();

		for (var i = 0; i < 2; i++) {
			
			for (var j = 0; j < L[i].length; j++ ) {
				model.add_link(els[i],nodeNames[L[i][j][0]], parseFloat(L[i][j][1]));
			}
		}
	}

	spectrum.update = true;
	spectrum.diagonalize();
	transport.plot();

	this.tran.toggle();
	this.diag.toggle();

};

this.loadFromString = function(str) {
	try {
		var model = $.parseJSON(str);
		return self.load(model.H,model.xy,model.L);
	} catch(err) {
		return;
	}	
};

}

//  ____  ____  _____ ____ _____ ____  _   _ __  __
// / ___||  _ \| ____/ ___|_   _|  _ \| | | |  \/  |
// \___ \| |_) |  _|| |     | | | |_) | | | | |\/| |
//  ___) |  __/| |__| |___  | | |  _ <| |_| | |  | |
// |____/|_|   |_____\____| |_| |_| \_\\___/|_|  |_|


function Spectrum(container) {

var self = this;

this.inodes = [];
this.energies = [];
this.orbitals = [];
this.selected = false;
this.update = true;

this.settings = {'adhocshift': 10}; // numerical trick

// Create drawing stage
var stage = new Kinetic.Stage({
	container: container,
	width: 250,
	height: 180
});

// Add energy-layer and a control-layer
var energyLayer = new Kinetic.Layer();
var controlLayer = new Kinetic.Layer();

stage.add(energyLayer);
stage.add(controlLayer);

this.hamiltonian = function(model) {

	this.inodes = [];
	for (var n in model.nodes) {
		if (!(model.nodes).hasOwnProperty(n)) {
			//The current property is not a direct property of p
			continue;
		}
		if (model.nodes[n].links.length > 0) {
			if (model.is_electrode(n)) {
				continue;
			}
			this.inodes.push(n);
		}
	}

	var N = this.inodes.length;

	if (N < 2) {return false;}

	if (N === 0) {
		return false;
	}

	var H = [];
	for(var i=0; i<N; i++) {
		H[i] = [];
		for(var j=0; j<N; j++) {
			H[i][j] = 0.0;
		}
	}

	for (i = 0; i < N; i++) {
		// console.log(i)
		// onsite energies
		H[i][i] = parseFloat(model.nodes[this.inodes[i]].weight) + spectrum.settings.adhocshift;

		for (var l = 0; l < (model.nodes[this.inodes[i]].links).length; ++l) {
			var link = model.nodes[this.inodes[i]].links[l];
				
			var i1 = this.inodes.indexOf(model.links[link].nodes[0]);
			var i2 = this.inodes.indexOf(model.links[link].nodes[1]);

			if (i1 === -1 || i2 === -1) {
				continue;
			}

			H[i1][i2] = parseFloat(model.links[link].weight);
			H[i2][i1] = parseFloat(model.links[link].weight);
		}
	}

	return H;
};

this.diagonalize = function() {

	if (this.update === false) {
		return;
	}

	var H = this.hamiltonian(model);

	if (H === false) {
		model.clearEigen();
		this.reset();
		return;
	}

	console.log('diagonalize model');

	var ev = numeric.eig(H,100000); // get eigensolutions

	// reorder by eigenvalues
	var indices = range(0,(ev.lambda.x).length-1);
	indices.sort(function(a,b) { return ev.lambda.x[a] < (ev.lambda.x)[b] ? -1 : 1;  });

	this.energies = [];
	this.orbitals = [];

	for (var i = 0; i < indices.length; i++) {
		var n = indices[i];
		this.energies[i] = ev.lambda.x[n] - spectrum.settings.adhocshift;
		this.orbitals[i] = [];
		for (var j = 0; j < indices.length; j++) {
			this.orbitals[i][j] = ev.E.x[j][n];
		}
	}

	// find scale
	var maxl = Math.max.apply(null, this.energies);
	var minl =  Math.min.apply(null, this.energies);
	var scale = Math.max(maxl,Math.abs(minl));

	var selected = false;
	if (this.selected !== false) {
		selected = this.selected.getId();
	}
	this.selected = false;

	// wipe the slate clean
	energyLayer.destroyChildren();

	var strokeColor = 'black';
	for(i = 0; i < (this.energies).length; i++) {

		var group = new Kinetic.Group({id: 'E' + i});

		strokeColor = 'black';
		if (selected !== false && selected == ('E' + i)) {
			strokeColor = 'red';
		}

		var line = new Kinetic.Line({
			points: [25, -i/(this.energies.length-1)*140 + 160 , 50, -this.energies[i]/scale*70+90, 170, -this.energies[i]/scale*70+90],
			stroke: strokeColor,
			strokeWidth: 3
		});

		var dot = new Kinetic.Circle({
			x: 25,
			y: -i/(this.energies.length-1)*140 + 160,
			radius: Math.min(Math.round(90/this.energies.length)-1,10),
			fill: strokeColor,
			stroke: strokeColor
		});

		group.add(line);
		group.add(dot);

		group.on('mouseover touchstart', function(evt) {
			self.select(this);
		});

		energyLayer.add(group);
	}

	self.drawControls();

	energyLayer.batchDraw();

	if (selected !== false)
	{
		selected = energyLayer.get('#' + selected)[0];
		self.select(selected);
	}

};

// Draw up and down controls
this.drawControls = function() {

	if (controlLayer.getChildren().length > 0) {
		return;
	}

	var upObj = new Image();
	var up = new Kinetic.Image({
          x: 180,
          y: 20,
          image: upObj,
          width: 60,
          height: 60
    });
    upObj.src = './assets/img/interface-02.png';

    up.on('touchstart mousedown',function(){
		self.selectNext(+1);
    });

	var downObj = new Image();
	var down = new Kinetic.Image({
          x: 180,
          y: 98,
          image: downObj,
          width: 60,
          height: 60
    });
    downObj.src = './assets/img/interface-01.png';

    down.on('touchstart mousedown',function(){
		self.selectNext(-1);
    });

	controlLayer.add(up);
	controlLayer.add(down);

	controlLayer.batchDraw();
		// controlLayer.draw();

};

this.select = function(group) {
	var i = parseInt((group.getId()).slice(1),10);

	if (this.selected !== false && this.selected.getId() == group.getId() ) {
		return;
	}

	model.drawMO(this.inodes,this.energies[i],this.orbitals[i]);

	this.kineticGroupSetStroke(group,'red');
	this.unselect();
	//energyLayer.batchDraw();
	this.selected = group;
};

this.selectNext = function(diff) {

	$( document.activeElement ).blur();

	var j = diff > 0 ? 0 : ((self.energies).length+diff);
	if (self.selected !== false) {
		if (diff < 0) {
			j = parseInt((self.selected.getId()).slice(1),10)+diff;
			j = j < 0 ? (self.energies.length-1) : j;
		} else {
			j = (parseInt((self.selected.getId()).slice(1),10)+1) % (self.energies.length);
		}
	}

	// console.log(self.energies);
	// console.log('eigen' + j);

	self.unselect();
	self.select(energyLayer.get('#E' + j)[0],j);
};

this.unselect = function() {
	if (this.selected!==false) {
		this.kineticGroupSetStroke(this.selected,'black');
	}
	this.selected = false;
	energyLayer.batchDraw();
};

this.kineticGroupSetStroke = function(group,stroke) {

	var children = group.getChildren(); // get children of group

    for(var i=0;i<children.length;i++){
        children[i].setFill(stroke);
        children[i].setStroke(stroke);
    }
};

this.reset = function() {
	this.inodes = [];
	this.energies = [];
	this.orbitals = [];
	this.unselect();

	energyLayer.destroyChildren().draw();
	controlLayer.destroyChildren().draw();
};

}

// TRANSPORT calculation
//////////////////////////////////////////////
function Transport() {

	this.plot = function() {
		var res = [this.calculate()];

		if (res === false) { return; }

		if ($('#huckler_transport h3').length == 0) {
			$('#huckler_transport')
				.append($('<h3></h3>').html('log[ (E &ndash; H)<sup>-2</sup> ]'))
				.append($('<div id="transport_plot"></div'))
				.append($('<span>E</span>'));
		}

		var options = {
			selection: {
				mode: "xy"
			}
		};

		var plot = $.plot("#transport_plot",res,options);


		$("#huckler_transport").bind("plotselected", function (event, ranges) {

			// clamp the zooming to prevent eternal zoom

			if (ranges.xaxis.to - ranges.xaxis.from < 0.00001) {
				ranges.xaxis.to = ranges.xaxis.from + 0.00001;
			}

			if (ranges.yaxis.to - ranges.yaxis.from < 0.00001) {
				ranges.yaxis.to = ranges.yaxis.from + 0.00001;
			}

			// do the zooming

			var plot = $.plot("#transport_plot", res,
				$.extend(true, {}, options, {
					xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to },
					yaxis: { min: ranges.yaxis.from, max: ranges.yaxis.to }
				})
			);
		});
	};
	
	this.calculate = function(xlim) {

		if (spectrum.energies.length > 1 ) {
			spectrum.diagonalize();
		}

		if (xlim === undefined) {
			xlim = [Math.min.apply(null,spectrum.energies), Math.max.apply(null, spectrum.energies)]
		}
		var electrodes = model.get_electrodes();
		if (electrodes.length < 2) { return false; }
		if (model.nodes[electrodes[0]].links.length < 1 || model.nodes[electrodes[1]].links.length < 1) {
			return false;
		}

		var omegas = numeric.linspace(xlim[0],xlim[1],600);
		var res = this.resolvent(omegas,electrodes);

		// console.log(omegas);
		// console.log(res);

		return numeric.transpose([omegas, res]);
	};

	this.resolvent = function (omegas,electrodes) {

		// Get Hamiltonian
		var H = spectrum.hamiltonian(model);

		var inner = newFilledArray(spectrum.energies.length,0);

		var el0 = model.nodes[electrodes[0]];
		for (var i = 0; i < el0.links.length; i ++) {
			var k = 0;
			if ((model.links[el0.links[i]]).nodes[0]==electrodes[0]) {
				k = 1;
			}
			inner[spectrum.inodes.indexOf(model.links[el0.links[i]].nodes[k])] = model.links[el0.links[i]].weight;
		}

		var outer = newFilledArray(spectrum.energies.length,0);

		var el1 = model.nodes[electrodes[1]];

		for (var j = 0; j < el1.links.length; j ++) {
			var m = 0;
			if ((model.links[el1.links[j]]).nodes[0]==electrodes[1]) {
				m = 1;
			}
			outer[spectrum.inodes.indexOf(model.links[el1.links[j]].nodes[m])] = model.links[el1.links[j]].weight;
		}

		var res = Array(omegas.length);

		var id = numeric.identity(spectrum.energies.length);

		for (var l=0; l < omegas.length; l++) {
			res[l] = Math.log(Math.abs(numeric.dot(inner,numeric.solve( numeric.add(numeric.mul(-omegas[l]-spectrum.settings.adhocshift,id),H,false),outer))));
		}

		return res;
	};

	this.reset = function() {
		$("#huckler_transport").html('');
	}
}	


//  __  __ ___ ____   ____
// |  \/  |_ _/ ___| / ___|
// | |\/| || |\___ \| |
// | |  | || | ___) | |___
// |_|  |_|___|____/ \____|

// A mode with a button
function DrawMode(button, fcn) {
	var self = this;

	this.mode = false;
	this.button = button.click(function() {
		self.toggle();
		if (fcn !== undefined) {
			fcn();
		}
	});

	this.toggle = function() {
		this.mode = !this.mode;
		if (this.mode === true) {
			document.body.style.cursor = "copy";
			this.button.html('ON');
			this.button.addClass('toggle');
		} else {
			document.body.style.cursor = "default";
			this.button.html('OFF');
			this.button.removeClass('toggle');
		}
	};

	this.reset = function() {
		this.mode = false;
		document.body.style.cursor = "default";
		this.button.removeClass('toggle');
		this.button.html('OFF');
	};
}

// Numeric range (from, to, )
function range(a,b,c,d){d=[];c=b-a+1;while(c--)d[c]=b--;return d;}

// Signum function
function sign(x) { return x < 0 ? -1 : 1; }

// Create a new array filled with values <val>
function newFilledArray(length, val) {
    var array = [];
    for (var i = 0; i < length; i++) {
        array[i] = val;
    }
    return array;
}

// Hamiltonian
function zeros(N,M) {
	var H = [];
	for(var i=0; i<N; i++) {
		H[i] = [];
		for(var j=0; j<M; j++) {
			H[i][j] = 0.0;
		}
	}
	return H;
}

function ring(N) {

	// hamiltonian
	var H = zeros(N,N);
	for(var i=0; i<N; i++) {
		H[i][(i+1) % N] = -1;
		H[(i+1)%N][i] = -1;
	}

	// xy
	var w = 520.0; var h = 405.0;
	var xy = []; 
	var fN = parseFloat(N);
	var R = w/6.0 + 2*fN;
	for (var i=0; i<N; i++) {
		xy[i] = [Math.round(w/2.0 + R*Math.cos(i*2.0*Math.PI/fN)), Math.round(h/2.0 + R*Math.sin(i*2.0*Math.PI/fN))];
	}

	// Leads
	var L = [];

	var json =  JSON.stringify({'H': H,'xy': xy,'L':L}, null, null);
	return json;
}

function chain(N, d) {
	
	if (isNaN(d)) { d = -1; }

	var H = zeros(N,N);
	for (var i=0; i< N-1; i++) {
		if (i % 2 == 0) {
			H[i][i+1] = -d;
			H[i+1][i] = -d;
		} else {
			H[i][i+1] = -1;
			H[i+1][i] = -1;
		}
	}

	// xy
	var w = 520.0; var h = 405.0;
	var xy = []; 
	var fN = parseFloat(N);
	for (var i=0; i<N; i++) {
		var dy = -25; if (i % 2 == 0) { dy = -dy; }
		var dx = 10/fN + w/5.8 - 4.3*fN;
		xy[i] = [Math.round(w/2.0 +dx/2 + dx*(i-N/2)), Math.round(h/2 + dy)];
	}

	// Leads
	var L = [];

	var json =  JSON.stringify({'H': H,'xy': xy,'L':L}, null, null);
	return json;
}
