/*	DxInterfaces JavaScript framework, version 0.1
 *	(c) 2014 Satoshi Komorita
 *
 *	dx is freely distributable under the terms of an MIT-style license.
 *
 *--------------------------------------------------------------------------*/

var DMS_Dx = function() {
	//	initialize
	this.username = "";
	this.password = "";
	this.dms_server = "";

	this.ws_conn = null;
	
	this.authorized = false;

	this.suc_message_handlers = new Object();
	this.err_message_handlers = new Object();
	
	this.on_device_get_message = null;
	this.on_device_set_message = null;

};

function dxlog(mes) {
	console.log(mes);
};

function getmessageid() { 
	return CryptoJS.SHA256("Message-" + (new Date()).toISOString()).toString();
}

DMS_Dx.prototype = {

	// set user info
	set_user: function( user, pass ) {
		this.username = user;
		this.password = pass;
	},
	
	// set server info
	set_server: function( host	) {
		this.dms_server = host;
	},
	
	// keepalive
	keep_alive: function(dev_id) {
		if (this.authorized && this.ws_conn) {
			this.dx_keep_alive_request(dev_id, null, null);
		}
	},
	
	
	//
	//	Dx Connections
	//
	connect: function( callback_suc, callback_err ) {
		//	disconnect current connection
		if (this.ws_conn != null) {
			return;
//			this.disconnect();
		}
		console.log(this.dms_server);
		this.ws_conn = new WebSocket( this.dms_server );
		
		//	open handler
		this.ws_conn.onopen = function() {
			dxlog("WebSocket Connected");
			this.dx_user_auth_requset( callback_suc, callback_err );
			
		}.bind(this);
		
		//	error handler
		this.ws_conn.onerror = function (error) {
		  dxlog(error);
		  this.disconnect();
		}.bind(this);
		
		//	message handler
		this.ws_conn.onmessage = function (e) {
		  dxlog('Get Message: ' + e.data);
		  
			var mes_obj = JSON.parse(e.data);
			
			switch( mes_obj.type )
			{
				case "user-auth-response":
					this.dx_user_auth_response(mes_obj);
					break;
				case "keep-alive-response":
					this.dx_keep_alive_response(mes_obj);
					break;
				case "device-register-response":
					this.dx_device_register_response(mes_obj);
					break;
				case "device-deregister-response":
					this.dx_device_deregister_response(mes_obj);
					break;
				case "device-update-response":
					this.dx_device_update_response(mes_obj);
					break;
				case "device-get-request":
					this.dx_device_get_request(mes_obj);
					break;
				case "device-set-request":
					this.dx_device_set_request(mes_obj);
					break;
				default:
					dxlog("Unknown Message");
			}
			
		  
		}.bind(this);
		
		//	close handler
		this.ws_conn.onclose = function(e) {
			this.ws_conn = null;
		}.bind(this);
		
	},
	
	disconnect: function() {
		if(this.ws_conn == null) {
			return;
		}
		
		this.ws_conn.close();
		this.ws_conn = null;
		this.authorized = false;
	},
	
	
	//
	//	Messages
	//
	dx_user_auth_requset: function( cb_suc, cb_err ) {
		dxlog( "send user-auth-requset");
		var mes_id = getmessageid();
		var auth_obj = { "type": "user-auth-request",
									"message-id": mes_id,
									"username": this.username,
									"password": this.password };
		var message = JSON.stringify( auth_obj );
		if (cb_suc) {this.suc_message_handlers[mes_id] = cb_suc;}
		if (cb_err) {this.err_message_handlers[mes_id] = cb_err;}
		

		dxlog("Send Message: " + message );
		this.ws_conn.send( message );

	},
	
	dx_user_auth_response: function(mes_obj) {
		dxlog( "recv user-auth-response");
		
		var mes_id = mes_obj['message-id'];
		if (mes_id) {
			if (mes_obj.status == "200 OK") {
				this.authorized = true;
				if (this.suc_message_handlers[mes_id]) { this.suc_message_handlers[mes_id](mes_obj) };
				
//				setInterval( (function(dv){ return function(){this.keep_alive(dv)}.bind(this);}(mes_obj["device-id"])), 60*1000 ); 
			} else {
				this.authorized = false;
				if (this.err_message_handlers[mes_id]) { this.err_message_handlers[mes_id](mes_obj) };
			}
			
			this.suc_message_handlers[mes_id] = null;
			this.err_message_handlers[mes_id] = null;

		} else {
			dxlog("Unknown Message Id");
		}
	},
	
	
	dx_keep_alive_request: function( dev_id, cb_suc, cb_err ) {
		dxlog( "send keep-alive-request");

		if (this.ws_conn == null || this.authorized == false) {return false;}
	  var now = new Date();
		var mes_id = getmessageid();
		if (cb_suc) {this.suc_message_handlers[mes_id] = cb_suc;}
		if (cb_err) {this.err_message_handlers[mes_id] = cb_err;}
		this.ws_conn.send( JSON.stringify({
		    "type": "keep-alive-request",
		    "device-id": dev_id,
		    "message-id": mes_id,
		    "timestamp": now.toISOString()
		}));
		
		return true;
	},

	dx_keep_alive_response: function(mes_obj) {
		dxlog( "recv keep-alive-response");

		var mes_id = mes_obj['message-id'];
		if (mes_id) {
			if (mes_obj.status == "200 OK") {
				if (this.suc_message_handlers[mes_id]) { this.suc_message_handlers[mes_id](mes_obj) };
			} else {
				if (this.err_message_handlers[mes_id]) { this.err_message_handlers[mes_id](mes_obj) };
			}
			
			this.suc_message_handlers[mes_id] = null;
			this.err_message_handlers[mes_id] = null;
		} else {
			dxlog("Unknown Message Id");
		}
	},

	
	dx_device_register_request: function( dev_id, props, name, desc, icon, cb_suc, cb_err) {
		dxlog( "send device-register-request");

		if (this.ws_conn == null || this.authorized == false) {return false;}
	  var now = new Date();
		var mes_id = getmessageid();
		if (cb_suc) {this.suc_message_handlers[mes_id] = cb_suc;}
		if (cb_err) {this.err_message_handlers[mes_id] = cb_err;}
	  var mes = {
			"type": "device-register-request",
	    "device-id": dev_id,
	    "name": name,
	    "description": desc,
	    "icon": icon,
	    "message-id": mes_id,
	    "timestamp": now.toISOString()
		};
		mes["props"] = props;

		dxlog( JSON.stringify(mes) );
		this.ws_conn.send( JSON.stringify(mes) );
		
		return true;
	},

	dx_device_register_response: function(mes_obj) {
		dxlog( "recv device-register-response");
		var mes_id = mes_obj['message-id'];
		if (mes_id) {
			if (mes_obj.status == "200 OK") {
				if (this.suc_message_handlers[mes_id]) { this.suc_message_handlers[mes_id](mes_obj) };
			} else {
				if (this.err_message_handlers[mes_id]) { this.err_message_handlers[mes_id](mes_obj) };
			}
			
			this.suc_message_handlers[mes_id] = null;
			this.err_message_handlers[mes_id] = null;
		} else {
			dxlog("Unknown Message Id");
		}
	},
	

	dx_device_deregister_request: function(dev_id, cb_suc, cb_err) {
		dxlog( "send device-deregister-request");

		if (this.ws_conn == null || this.authorized == false) {return;}
	  var now = new Date();
		var mes_id = getmessageid();
		if (cb_suc) {this.suc_message_handlers[mes_id] = cb_suc;}
		if (cb_err) {this.err_message_handlers[mes_id] = cb_err;}
	  var mes = {
			"type": "device-deregister-request",
	    "device-id": dev_id,
	    "message-id": mes_id,
	    "timestamp": now.toISOString()
		};
		
		this.ws_conn.send( JSON.stringify(mes) );
	},
	
	dx_device_deregister_response: function(mes_obj) {
		dxlog( "recv device-deregister-response");
		var mes_id = mes_obj['message-id'];
		if (mes_id) {
			if (mes_obj.status == "200 OK") {
				if (this.suc_message_handlers[mes_id]) { this.suc_message_handlers[mes_id](mes_obj) };
			} else {
				if (this.err_message_handlers[mes_id]) { this.err_message_handlers[mes_id](mes_obj) };
			}
			
			this.suc_message_handlers[mes_id] = null;
			this.err_message_handlers[mes_id] = null;
		} else {
			dxlog("Unknown Message Id");
		}
	},
	
	
	dx_device_update_request: function(dev_id, props, cb_suc, cb_err) {
		dxlog( "send device-update-request");

		if (this.ws_conn == null || this.authorized == false) {return false;}
	  var now = new Date();
		var mes_id = getmessageid();
		if (cb_suc) {this.suc_message_handlers[mes_id] = cb_suc;}
		if (cb_err) {this.err_message_handlers[mes_id] = cb_err;}
	  var mes = {
			"type": "device-update-request",
	    "device-id": dev_id,
	    "message-id": mes_id,
	    "timestamp": now.toISOString()
		};
		mes["props"] = props;
		this.ws_conn.send( JSON.stringify(mes) );
		
		return true;
	},

	dx_device_update_response: function(mes_obj) {
		dxlog( "recv device-update-response");
		var mes_id = mes_obj['message-id'];
		if (mes_id) {
			if (mes_obj.status == "200 OK") {
				if (this.suc_message_handlers[mes_id]) { this.suc_message_handlers[mes_id](mes_obj) };
			} else {
				if (this.err_message_handlers[mes_id]) { this.err_message_handlers[mes_id](mes_obj) };
			}
			
			this.suc_message_handlers[mes_id] = null;
			this.err_message_handlers[mes_id] = null;
		} else {
			dxlog("Unknown Message Id");
		}
	},

	
	//	requests from server
	dx_device_get_request: function(mes_obj) {
		dxlog( "recv device-get-request");

		var mes_id = mes_obj['message-id'];
		var dev_id = mes_obj['device-id'];
		if (mes_id) {
			if (this.on_device_get_message) {
				res_obj = this.on_device_get_message( devid, mes_obj['props'] );
				
			  var mes = {
					"type": "device-get-response",
			    "device-id": dev_id,
			    "message-id": mes_id,
			    "timestamp": now.toISOString()
				};
				mes['props'] = res_obj;
				this.ws_conn.send( JSON.stringify(mes) );
				
			} else {
				dxlog("Callback fucniton is not registered for device-get-request");
			}
		} else {
			dxlog("Bad Message Format: No message-id");
		}
	},

	
	dx_device_set_request: function(mes_obj) {
		dxlog( "recv device-set-request");

		var mes_id = mes_obj['message-id'];
		var dev_id = mes_obj['device-id'];
		if (mes_id) {
			if (this.on_device_set_message) {
				res_obj = this.on_device_set_message( dev_id, mes_obj['props'] );
				
			  var mes = {
					"type": "device-set-response",
			    "device-id": dev_id,
			    "message-id": mes_id,
				};
				mes['props'] = res_obj;
				this.ws_conn.send( JSON.stringify(mes) );
				
			} else {
				dxlog("Callback fucniton is not registered for device-set-request");
			}
		} else {
			dxlog("Bad Message Format: No message-id");
		}
	},
	

};

