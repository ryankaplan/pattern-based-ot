/// <reference path='../base/lang.ts' />

module OpId {
  function idParse(id: string) {
    return JSON.parse(id);
  }
  
  export function create(siteId: number, opId: number): string {
    return JSON.stringify([siteId, opId]);
  }
  
  // return -1 if id1 < id2, 0 if they're equal, 1 if id1 > id2
	export function compare(id1: string, id2: string): ComparisonResult {
    let parsed1 = idParse(id1);
    let parsed2 = idParse(id2);
    
    if (parsed1[0] < parsed2[0]) {
      return ComparisonResult.LESS_THAN;
    } else if (parsed1[0] > parsed2[0]) {
      return ComparisonResult.GREATER_THAN;
    }

    // index 0 is equal, fall back on 1
    if (parsed1[1] < parsed2[1]) {
      return ComparisonResult.LESS_THAN;        
    } else if (parsed1[1] > parsed2[1]) {
      return ComparisonResult.GREATER_THAN;
    }
    
    return ComparisonResult.EQUAL;
	}
}

module TextOperation {
	enum Type {
		INSERT,
		DELETE
	}

	export class Operation {
		constructor(
			private _id: string,
			private _type: Type,
			private _char: string, // null for DELETE
			private _location: number
		) { }

		public static Insert(id: string, char: string, location: number) {
			return new Operation(id, Type.INSERT, char, location);
		}

		public static Delete(id: string, location: number) {
			return new Operation(id, Type.DELETE, null, location);
		}

		public clone() {
			return new Operation(
        this._id,
        this._type,
        this._char,
        this._location
      );
		}

		public fromJson(jsonString: string): Operation {
			var parsed = JSON.parse(jsonString);
			return new Operation(
				parsed['id'],
				parsed['type'],
				parsed['char'],
				parsed['location']
			);
		}

		public toJson(): string {
			return JSON.stringify({
				'id': this._id,
				'type': this._type,
				'char': this._char,
				'location': this._location
			});
		}

		//////////////////////////////////////////////////////////////////

    public id(): string { return this._id; }
		private type(): Type { return this._type; }
		private char(): string { return this._char; }
		private location(): number { return this._location; }

		private isDelete(): boolean { return this._type == Type.DELETE; }
		private isInsert(): boolean { return this._type == Type.INSERT; }

    private compareLocation(other: Operation): ComparisonResult {
      if (this.location() < other.location()) {
        return ComparisonResult.LESS_THAN;
      } else if (this.location() > other.location()) {
        return ComparisonResult.GREATER_THAN;
      } else {
        return OpId.compare(this.id(), other.id());
      }
    }
    
    // Modifies string (array of characters) to account for this operation
    public execute(data: Array<string>) {
      if (this.isInsert()) {
        if (this.location() < 0) {
          console.log('Can\'t  apply operation ' + this.toJson());
          console.log('Target document is ' + data);
          throw 'TextOperation::execute error; insert location is negative';
        }
        
        if (this.location() > data.length) {
          console.log('Can\'t  apply operation ' + this.toJson());
          console.log('Target document is ' + data);
          throw 'TextOperation::execute error; insert location is too large';
        }
        
        data.splice(this._location, 0, this._char); 
      }
      
      else if (this.isDelete()) {
        if (this.location() < 0) {
          console.log('Can\'t  apply operation ' + this.toJson());
          console.log('Target document is ' + data);
          throw 'TextOperation::execute error; insert location is negative';
        }
        
        if (this.location() > data.length - 1) {
          console.log('Can\'t  apply operation ' + this.toJson());
          console.log('Target document is ' + data);
          throw 'TextOperation::execute error; insert location is too large';
        }
        
        data.splice(this._location, 1);
      } else {
        throw "Unhandled op type " + this.type();
      }
    }

    // Returns a clone of this operation which accounts for other
    // happening before it. Throws if other == this.
		public transform(other: Operation) {
			var copy = this.clone();
      
      if (this.id() == other.id()) {
        throw 'Operations have the same id!';
      }
      
      let locationRelation = this.compareLocation(other);
      assert(locationRelation != ComparisonResult.EQUAL, 'Not possible since ids are different, as enforced above');
 
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

      } else {
        throw "Unrecognized operation types " + this.type() + " " + other.type();
      }
    }
	}
}
