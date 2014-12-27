/*--------------------------------------------------------------------------*
 *       (c) 2014 Shohei Toyota
 * Released under The MIT License.
 * http://opensource.org/licenses/MIT
 *--------------------------------------------------------------------------*/
var PartsManager = (function(){
    var constructor = function(){
        var partsList = [];
        /*
        {
            'name' : name,
            'value': value,
            'type' : type,
            'mode' : mode,
            'direction': direction,
            'pin'  : pin
        }
         */

        this.assignParts = function(parts){
            partsList = [];
            parts.forEach(function(elm, idx, ary){
                if(elm){
                    partsList.push(elm);
                }
            });  
        };
        this.setPart = function(part, num){
            partsList[num] = part;
        };
        this.removePart = function(idNum){
            delete partsList[idNum];
        };
        
        this.getNumByName = function(name){
            for(var i = 0; i < partsList.length; i++){
                if(partsList[i] !== undefined && partsList[i].name === name){
                    return i;
                }
            };
            return false;
        };
        
        this.getPartByNum = function(idNum){
            if(partsList[idNum]){
                return partsList[idNum];
            }else{
                return false;
            }
        };
        this.getPartByName = function(name){
            var idNum = this.getNumByName(name);
            if(partsList[idNum]){
                return partsList[idNum];
            }else{
                return false;
            }
        };
        this.getPartsAll = function(){
            return partsList;
        };
        
        this.getPropsAll = function(){
            var props = {};
            for(var i = 0; i < partsList.length; i++){
                if(partsList[i]){
                    var part = partsList[i];
                    props[part.name] = {
                        value: part.value,
                        type : part.type,
                        mode : part.mode,
                        direction: part.direction
                    };
                }
            }
            return props;
        };
        this.getUpdateProps = function(values){
            var props = {};
            partsList.forEach(function(part, idx, ary){
                if(part.mode === 'writeonly' || values[part.pin] === undefined){
                    return;
                }
                props[part.name] = {
                    value: values[part.pin]
                };
            });
            return props;
        };
        
    };
    
    return constructor;
})();