/*--------------------------------------------------------------------------*
 *	GW App for WoT JavaScript framework, version 0.1
 *	(c) 2014 Satoshi Komorita
 *
 *	GW App is freely distributable under the terms of an MIT-style license.
 *
 *------------------------------------------------------------------------- * 
 * GW App for Arduino
 *       arranged by Shohei Toyota
 *--------------------------------------------------------------------------*/

//
//	initialize
//
var myGluin = new DMS_Dx();
var mydevice_id = "ArduinoGW-";
var mydevice_name = "ArduinoGW";
var mydevice_desc = "Gateway for Arduino";
var mydevice_icon = "iSensor"; // iSensor, iSwitch, iLight, iMonitor, iMic, iSpeaker

var myParts = new PartsManager();
var myXbee = new XbeeSocket();
var myArduino = new Arduino();
myArduino.setSocket(myXbee);

/*
var mydevice_props = {
    "NAME" : {
        "value" :
        "type": [boolean, integer, float, string],
        "mode": [readony, writeonly, readwrite],
        "direction": [uponly, downonly, updown]
    }
};
*/

var b_reg = false;
var reloadInterval = 1*1000;

$(document).ready(function(){
    
    // Xbee Wi-Fi Setting
    $('#test-connect').on('click', function(){
        saveUserSetting();
        
        var host = $('#Xbee_IP').val();
        var port = $('#Xbee_port').val();
        myXbee.setHost(host, port);
        myArduino.analogRead(0).then(function(){
            alert('OK');
        },function(){
            alert('ERROR');
        });
    });
    
    //	Pill Nav Bar Conrol
    $('#pill_settings').hide();
    $('#pill_log').hide();
    $('#nav_sensors').click(function(){
            $('#pill_sensors').show("fast");
            $('#pill_settings').hide();
            $('#pill_log').hide();

            $('#nav_sensors').addClass('active');
            $('#nav_settings').removeClass('active');
            $('#nav_log').removeClass('active');
    });
    $('#nav_settings').click(function(){
            $('#pill_sensors').hide();
            $('#pill_settings').show("fast");
            $('#pill_log').hide();

            $('#nav_sensors').removeClass('active');
            $('#nav_settings').addClass('active');
            $('#nav_log').removeClass('active');
    });
    $('#nav_log').click(function(){
            $('#pill_sensors').hide();
            $('#pill_settings').hide();
            $('#pill_log').show("fast");

            $('#nav_sensors').removeClass('active');
            $('#nav_settings').removeClass('active');
            $('#nav_log').addClass('active');
    });

    // Setting Page
    $('#btn_register').click(function(){
            var hash = CryptoJS.SHA256( $('#dms_username').val() ).toString().substr(0, 16);
        
            if(mydevice_name !== $('#device_name').val()){ // Device Nameが変更
                //$('#device-id').text('Device ID: ' + mydevice_id);
                myGluin.dx_device_deregister_request(mydevice_name + '-' + hash);
            }
            mydevice_id = $('#device_name').val() + '-' + hash;
            
            saveUserSetting();
            dev_register();	//	connect & register
    });

    $('#btn_deregister').click(function(){
            dev_deregister();	//	connect & register
    });


    // Log Page
    $('#logclear').click(function(){
            $('#logbase').empty();
    });
    
    // Start / Stop
    var timer;
    $('#startstop').text('START').on('click', function(){
        if($(this).text() === 'START'){
            if(!myGluin.authorized){
                dev_register();
            }
            
            $(this).text('STOP');
            timer = setInterval( function(){
                readPartsValues().then(function(props){
                    updatePartsUI(props);
                    updateGluinValues(props);
                }, null);
            }, reloadInterval );
        }else{
            $(this).text('START');
            clearInterval(timer);
        }
    });
    
    // Add Part
    $('#addPart').on('click', function(){
       addPart();
    });
    $('#addPart').prop('disabled', false);
    
    // 設定項目読込
    loadUserSetting();

    // Device ID表示
    $('#device-id').text('Device ID: ' + mydevice_id);

    // Keep-Alive
    setInterval( timer_keep_alives, 60*1000 );
    
});

//--------------------------------------------------

//
//	Parts
//
function readPartsValues(){
    myArduino.values = [];
    var partsList = myParts.getPartsAll();
    var readFuncList = [];
    for(var key in partsList){
        var elm = partsList[key];
        if(elm.mode !== 'writeonly'){
            switch(elm.type){
                case 'integer':
                    readFuncList.push(myArduino.analogRead(elm.pin));
                    break;
                case 'boolean':
                    readFuncList.push(myArduino.digitalRead(elm.pin));
                    break;
            }
        }
    }
    return Promise.all(readFuncList).then(function(vals){
        return myParts.getUpdateProps(myArduino.values);
    });
}

function writePartsValues(props){
    for(var key in props){
        var part;
        if((part = myParts.getPartByName(key)) === false) break;
        if(part.mode === 'readonly') break;
        
        myArduino.pinMode(part.pin, 'OUTPUT');
        switch(part.type){
            case 'integer':
            case 'float':
                myArduino.analogWrite(part.pin, props[key].value);
                break;
            case 'boolean':
                myArduino.digitalWrite(part.pin, props[key].value);
                break;
        }
    }
}

function updatePartsUI(props){
    for(var key in props){
        var num;
        if( (num = myParts.getNumByName(key)) !== false ){
            $('#partValue' + num).text(props[key].value);
        }
    }
}

function updateGluinValues(props){
    if(myGluin.authorized === true){
        myGluin.dx_device_update_request( mydevice_id, props, null, null );
    }
}

// 
// Add Parts
//
function addPart(idNum){
	var htmlPart = '<div class="panel panel-default" id="partPanel{{Number}}">\
    <div class="input-group">\
        <input type="text" class="form-control" value="" id="partName{{Number}}" placeholder="Part Name">\
        <span class="input-group-btn">\
            <button type="button" class="btn btn-warning" id="removePart{{Number}}">\n\
                <span class="glyphicon glyphicon-trash"></span> Remove\
            </button>\
            <button type="button" class="btn btn-primary" id="editPart{{Number}}">\
                <span class="glyphicon glyphicon-pencil"></span> Edit\
            </button>\
        </span>\
    </div>\
    <div class="input-group">\
        <span class="input-group-addon">Value</span>\
        <span class="form-control" id="partValue{{Number}}"></span>\
    </div>\
    <div class="panel-body" id="partPanelBody{{Number}}">\
        <div class="input-group">\
            <span class="input-group-addon">Type</span>\
            <select class="form-control" id="partType{{Number}}">\
                <option value="boolean">Boolean</option>\
                <option value="integer">Integer</option>\
                <option value="float">Float</option>\
                <option value="string">String</option>\
            </select>\
        </div>\
        <div class="input-group">\
            <span class="input-group-addon">Mode</span>\
            <select class="form-control" id="partMode{{Number}}">\
                <option value="readonly">Read Only</option>\
                <option value="writeonly">Write Only</option>\
                <option value="readonly">Read Write</option>\
            </select>\
        </div>\
        <div class="input-group">\
            <span class="input-group-addon">Direction</span>\
            <select class="form-control" id="partDirection{{Number}}">\
                <option value="uponly">Up Only</option>\
                <option value="downonly">Down Only</option>\
                <option value="updown">Up Down</option>\
            </select>\
        </div>\
        <div class="input-group">\
            <span class="input-group-addon">Arduino Pin</span>\
            <select class="form-control" id="partPin{{Number}}">\
                {{Ports}}\
            </select>\
        </div>\
        <br>\
        <center>\
            <button type="button" class="btn btn-primary btn-lg" id="registPart{{Number}}">\
                <span class="glyphicon glyphicon-ok"></span> Register\
            </button>\
        </center>\
    </div>\
</div>';
    
    if(typeof idNum === 'undefined'){
        var partNumber = myParts.getPartsAll().length + 1;
    }else{
        var partNumber = idNum;
    }
    htmlPart = htmlPart.replace(/{{Number}}/g, partNumber);
    
    // Arduino Pins
    var htmlPins = '';
    for(var i = 2; i <= 19; i++){
        var pinName = (i < 14) ? i : 'A' + (i-14); 
        htmlPins += '<option value="'+ i +'">'+ pinName +'</option>';
    }
    htmlPart = htmlPart.replace(/{{Ports}}/g, htmlPins);
    
    $('#partsBody').append(htmlPart);
    $('#editPart' + partNumber).hide();
    initPart(partNumber);
    
    $('#addPart').prop('disabled', true);
}

function initPart(idNum){
    $('#removePart' + idNum).on('click', function(){
        if (confirm('削除を実行しますか?')) {
            $('#partPanel' + idNum).remove();
            $('#addPart').prop('disabled', false);
            myParts.removePart(idNum);
            registerGluinDevice();
        }
    });
    
    $('#editPart' + idNum).on('click', function(){
        myParts.removePart(idNum);
        
        $('#partName' + idNum).unbind();
        $('#removePart' + idNum).show();
        $('#editPart' + idNum).hide();
        $('#partPanelBody' + idNum).show();
    });
    
    $('#registPart' + idNum).on('click', function(){
        var name = $('#partName' + idNum).val();
        
        if( name === '' ){
            alert('名前を入力してください。');
            return;
        }
        if( myParts.getNumByName(name) !== false && myParts.getNumByName(name) !== idNum ){
            alert('同じ名前が存在します。');
            return;
        }
        
        var type = $('#partType' + idNum).val();
        var mode = $('#partMode' + idNum).val();
        var direction = $('#partDirection' + idNum).val();
        var value;
        switch(type){
            case 'boolean': value = false; break;
            case 'string' : value = '';    break;
            default       : value = 0;     break;
        }
        var pin = parseInt($('#partPin' + idNum).val());
        myParts.setPart({
            'name': name,
            'value': value,
            'type': type,
            'mode': mode,
            'direction': direction,
            'pin': pin
        }, idNum);

        $('#partName' + idNum).on("keydown focus change", stopDefEvent);
        $('#removePart' + idNum).hide();
        $('#editPart' + idNum).show();
        $('#partPanelBody' + idNum).hide();
        $('#addPart').prop('disabled', false);
        
        registerGluinDevice();
    });
}


function stopDefEvent(e){
    e.preventDefault();
}

//
//	Logger
//
function addlog( log, level )
{
	var obj = '<div class="alert alert-' + level + '" role="alert">' + log + '</div>';
	$('#logbase').append( obj );
}

//
//	Settings
//
function saveUserSetting()
{
    // User Setting
    var user = $('#dms_username').val();
    var pass = $('#dms_password').val();
    localStorage.setItem("USERNAME", user);
    localStorage.setItem("PASSWORD", pass);
    
    // Server Setting
    var serv = $('#dms_server').val();
    localStorage.setItem('SERVER', serv);
    
    // Device Setting
    mydevice_name = $('#device_name').val();
    localStorage.setItem('DEVICE_NAME', mydevice_name);
    localStorage.setItem('DEVICE_ID', mydevice_id);
    
    // Xbee Wi-Fi Setting
    var XbeeIP   = $('#Xbee_IP').val();
    var XbeePort = $('#Xbee_port').val();
    localStorage.setItem("XBEE_IP", XbeeIP);
    localStorage.setItem("XBEE_PORT", XbeePort);
    
    // mydevice_parts
    localStorage.setItem("MYDEVICE_PARTS", JSON.stringify(myParts.getPartsAll()));
}

function loadUserSetting()
{
    // User Setting
	var user = localStorage.getItem("USERNAME");
	var pass = localStorage.getItem("PASSWORD");
	$('#dms_username').val( user );
	$('#dms_password').val( pass );
    
    // Server Setting
	var serv = localStorage.getItem("SERVER");
    if(serv){
    	$('#dms_server').val( serv );
    }
    
    // Device Setting
    var device_name = localStorage.getItem("DEVICE_NAME");
    var device_id   = localStorage.getItem("DEVICE_ID");
    if(device_name && device_id){
        mydevice_name = device_name;
        mydevice_id   = device_id;
    }
    $('#device_name').val(mydevice_name);
    
    // Xbee Wi-Fi Setting
    var XbeeIP = localStorage.getItem("XBEE_IP");
    var XbeePort = localStorage.getItem("XBEE_PORT");
    $('#Xbee_IP').val( XbeeIP );
    $('#Xbee_Port').val( XbeePort );
    myXbee.setHost(XbeeIP, XbeePort);
    
    // mydevice_parts
    var parts = localStorage.getItem("MYDEVICE_PARTS");
    if(parts){
        parts = JSON.parse(parts);
        var i = 0;
        parts.forEach(function(part, idx, ary){
            if(!part) return;
            addPart(i);
            $('#partName' + i).val(part.name);
            $('#partType' + i).val(part.type);
            $('#partMode' + i).val(part.mode);
            $('#partDirection' + i).val(part.direction);
            $('#partPin' + i).val(part.pin);
            $('#registPart' + i).trigger('click');
            i++;
        });
    }
}

//
//	Gluin connection
//
function connectGluin(){
    var user = $('#dms_username').val();
    var pass = $('#dms_password').val();
    var serv = $('#dms_server').val();

    if(user && pass && serv){
        myGluin.set_user( user, pass );
        myGluin.set_server( serv );
        myGluin.connect();
    }
}

function dev_register() 
{
    var user = $('#dms_username').val();
    var pass = $('#dms_password').val();
    var serv = $('#dms_server').val();

    if(!user || !pass || !serv){
        return;
    }

    myGluin.set_user( user, pass );
    myGluin.set_server( serv );
    
    if(myGluin.authorized === false){
        myGluin.connect( 
            registerGluinDevice, 
            function(){ console.log("ERROR: Connect to server and auth");}
        );
    }else{
        registerGluinDevice();
    }

    myGluin.on_device_get_message = get_request_handler;
    myGluin.on_device_set_message = set_request_handler;
}

function registerGluinDevice(){
    localStorage.setItem("MYDEVICE_PARTS", JSON.stringify(myParts.getPartsAll()));
    
    var props = myParts.getPropsAll();
    myGluin.dx_device_register_request(mydevice_id, props, mydevice_name, mydevice_desc, mydevice_icon,
        function(){
            console.log( "Registered");
            addlog( "Registerd<br>Device ID:" + mydevice_id, "info" );
            b_reg = true;
        }, 
        function(){
            addlog( " cannot be Registerd", "danger" );
            console.log("Register Error");
            b_reg = false;
        }
    );
}

function dev_deregister() 
{
    myGluin.dx_device_deregister_request( mydevice_id, 
        function() {
            console.log( "De-Registered");
            addlog( "De-Registerd", "info" );
            myGluin.disconnect();
        },
        function() {
            console.log( "Failed to De-Registered");
            addlog( "Failed to De-Registerd", "info" );
            myGluin.disconnect();
        } );
    b_reg = false;
}

function timer_keep_alives()
{
    if (b_reg) {
            myGluin.keep_alive(mydevice_id,null,null);
    }	
}

function get_request_handler( devid, props_obj )
{
    console.log(props_obj);
}

function set_request_handler( devid, props_obj )
{
    if (devid !== mydevice_id) return;
    console.log("recv props: ", props_obj);
    
    updatePartsUI(props_obj);
    writePartsValues(props_obj);
}

