function assert(value, message) {
    if (message === void 0) { message = 'No message'; }
    if (!value) {
        throw {
            'message': message
        };
    }
}
var ComparisonResult;
(function (ComparisonResult) {
    ComparisonResult[ComparisonResult["GREATER_THAN"] = 0] = "GREATER_THAN";
    ComparisonResult[ComparisonResult["EQUAL"] = 1] = "EQUAL";
    ComparisonResult[ComparisonResult["LESS_THAN"] = 2] = "LESS_THAN";
})(ComparisonResult || (ComparisonResult = {}));
/// <reference path='../base/lang.ts' />
var OpId;
(function (OpId) {
    function idParse(id) {
        return JSON.parse(id);
    }
    function create(siteId, opId) {
        return JSON.stringify([siteId, opId]);
    }
    OpId.create = create;
    function compare(id1, id2) {
        var parsed1 = idParse(id1);
        var parsed2 = idParse(id2);
        if (parsed1[0] < parsed2[0]) {
            return ComparisonResult.LESS_THAN;
        }
        else if (parsed1[0] > parsed2[0]) {
            return ComparisonResult.GREATER_THAN;
        }
        if (parsed1[1] < parsed2[1]) {
            return ComparisonResult.LESS_THAN;
        }
        else if (parsed1[1] > parsed2[1]) {
            return ComparisonResult.GREATER_THAN;
        }
        return ComparisonResult.EQUAL;
    }
    OpId.compare = compare;
})(OpId || (OpId = {}));
var TextOperation;
(function (TextOperation) {
    var Type;
    (function (Type) {
        Type[Type["INSERT"] = 0] = "INSERT";
        Type[Type["DELETE"] = 1] = "DELETE";
    })(Type || (Type = {}));
    var Operation = (function () {
        function Operation(_id, _type, _char, _location) {
            this._id = _id;
            this._type = _type;
            this._char = _char;
            this._location = _location;
        }
        Operation.Insert = function (id, char, location) {
            return new Operation(id, Type.INSERT, char, location);
        };
        Operation.Delete = function (id, location) {
            return new Operation(id, Type.DELETE, null, location);
        };
        Operation.prototype.clone = function () {
            return new Operation(this._id, this._type, this._char, this._location);
        };
        Operation.prototype.fromJson = function (jsonString) {
            var parsed = JSON.parse(jsonString);
            return new Operation(parsed['id'], parsed['type'], parsed['char'], parsed['location']);
        };
        Operation.prototype.toJson = function () {
            return JSON.stringify({
                'id': this._id,
                'type': this._type,
                'char': this._char,
                'location': this._location
            });
        };
        Operation.prototype.id = function () { return this._id; };
        Operation.prototype.type = function () { return this._type; };
        Operation.prototype.char = function () { return this._char; };
        Operation.prototype.location = function () { return this._location; };
        Operation.prototype.isDelete = function () { return this._type == Type.DELETE; };
        Operation.prototype.isInsert = function () { return this._type == Type.INSERT; };
        Operation.prototype.compareLocation = function (other) {
            if (this.location() < other.location()) {
                return ComparisonResult.LESS_THAN;
            }
            else if (this.location() > other.location()) {
                return ComparisonResult.GREATER_THAN;
            }
            else {
                return OpId.compare(this.id(), other.id());
            }
        };
        Operation.prototype.execute = function (data) {
            if (this.isInsert()) {
                data.splice(this._location, 0, this._char);
            }
            else if (this.isDelete()) {
                data.splice(this._location, 1);
            }
            else {
                throw "Unhandled op type " + this.type();
            }
        };
        Operation.prototype.transform = function (other) {
            var copy = this.clone();
            var locationRelation = this.compareLocation(other);
            assert(locationRelation != ComparisonResult.EQUAL, 'transform was called with two of the same op!');
            if (other.isInsert() && this.isInsert()) {
                if (locationRelation == ComparisonResult.GREATER_THAN) {
                    copy._location += 1;
                }
            }
            else if (other.isInsert() && this.isDelete()) {
                if (locationRelation == ComparisonResult.GREATER_THAN) {
                    copy._location += 1;
                }
            }
            else if (other.isDelete() && this.isInsert()) {
                if (locationRelation == ComparisonResult.GREATER_THAN) {
                    copy._location -= 1;
                }
            }
            else if (other.isDelete && this.isDelete()) {
                if (locationRelation == ComparisonResult.GREATER_THAN) {
                    copy._location -= 1;
                }
            }
            else {
                throw "Unrecognized operation types " + this.type() + " " + other.type();
            }
        };
        return Operation;
    })();
    TextOperation.Operation = Operation;
})(TextOperation || (TextOperation = {}));
/// <reference path='../base/lang.ts' />
/// <reference path='text.ts' />
var TextOp = TextOperation.Operation;
function runTests() {
    var op = TextOp.Insert('', 'a', 0);
}
runTests();
//# sourceMappingURL=client.js.map