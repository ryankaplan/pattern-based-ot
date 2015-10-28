
module TextOperation {
	enum Type {
		INSERT,
		DELETE
	}



	function idCompare(id1: string, id2: string) {

	}

	export class Operation {
		constructor(
			private _id: string,
			private _type: Type,
			private _char: string, // null for DELETE
			private _location: number
		) { }

		static Insert(id: string, char: string, location: number) {
			return new Operation(id, Type.INSERT, char, location);
		}

		static Delete(location: number) {
			return new Operation(id, Type.DELETE, null, location);
		}

		clone() {
			return new Operation(id, this._type, this._char, this._location);
		}

		fromJson(jsonString: string): Operation {
			var parsed = JSON.parse(jsonString);
			return new Operation(
				parsed['id'],
				parsed['type'],
				parsed['char'],
				parsed['location']
			);
		}

		toJson(): string {
			return JSON.stringify({
				'id': this._id,
				'type': this._type,
				'char': this._char,
				'location': this._location
			});
		}

		//////////////////////////////////////////////////////////////////

		type() {
			return this._type;
		}

		char() {
			return this._char;
		}

		location() {
			return this._location;
		}

		isDelete() {
			return this._type == Type.DELETE;
		}

		isInsert() {
			return this._type == Type.INSERT;
		}

		transform(other: Operation) {
			var copy = this.clone();

			if (other.isInsert()) {
				if (this.isInsert()) {
					// Other is an insert and we're an insert.
					if (other.location() < this.location()) {

					}

				} else if (this.isDelete()) {

				} else {
					throw "Unrecognized operation type:" + this.type();
				}
			}

			else if (other.isDelete()) {
				if (this.isInsert()) {

				} else if (this.isDelete()) {

				} else {
					throw "Unrecognized operation type:" + this.type();
				}
			}

			else {
				throw "Unrecognized operation type:" + other.type();
			}

			return copy;
		}
	}
}
