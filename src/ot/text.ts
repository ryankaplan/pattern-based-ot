/// <reference path='operation.ts' />

/// <reference path='../base/list.ts' />
/// <reference path='../base/logging.ts' />

enum Type {
	INSERT,
	DELETE
}

class TextOp extends Operation {
	constructor(
		private _type: Type,
		private _char: string, // null for DELETE
		private _location: number
	) {
		super()
	}

	static Insert(char: string, location: number) { return new TextOp(Type.INSERT, char, location); }
	static Delete(location: number) { return new TextOp(Type.DELETE, null, location); }

	initWithJson(parsed: any): void {
		this._type = parsed['type'];
		this._char = parsed['char'];
		this._location = parsed['location'];
		super.initWithJson(parsed);
	}

	fillJson(json: any): void {
		json['type'] = this._type;
		json['char'] = this._char;
		json['location'] = this._location;
		super.fillJson(json);
	}

	copy(other: TextOp): void {
		this._type = other._type;
		this._char = other._char;
		this._location = other._location;
		super.copy(other);
	}

	//////////////////////////////////////////////////////////////////

	type() { return this._type; }
	char() { return this._char; }
	location() { return this._location; }
	isDelete() { return this._type == Type.DELETE; }
	isInsert() { return this._type == Type.INSERT; }

	// Transform works for two operations a and b such that
	//
	// tA = a.transform(b)
	// tB = b.transform(a)
	//
	// and applying a and then tB to a document has the same result
	// as a applying b and then tA.

	transform(other_: Operation) {
		let other = <TextOp>other_;
		let copy = new TextOp(null, null, null);
		copy.copy(this);

		if (DEBUG) {
			let jsonThis = {};
			this.fillJson(jsonThis);

			let jsonOther = {};
			other.fillJson(jsonOther);

			debug('About to transform operations');
			debug('This: ', jsonThis);
			debug('Other: ', other);
		}

		let locationRelation = compare(this.location(), other.location());

		if (this.isInsert() && other.isInsert()) {
			debug('Insert vs. Insert. locationRelation = ', locationRelation);

			if (locationRelation == ComparisonResult.GREATER_THAN) {
				copy._location += 1;
			} else if (locationRelation == ComparisonResult.EQUAL && this._char > other._char) {
				copy._location += 1;
			}
		}

		else if (this.isDelete() && other.isInsert()) {
			debug('Delete vs. Insert. locationRelation = ', locationRelation);

			// Insert operations are applied before delete operations when there's a location tie
			if (locationRelation == ComparisonResult.GREATER_THAN || locationRelation == ComparisonResult.EQUAL) {
				copy._location += 1;
			}
		}

		else if (this.isInsert() && other.isDelete()) {
			debug('Insert vs. Delete. locationRelation = ', locationRelation);

			// Insert operations are applied before delete operations when there's a location tie
			if (locationRelation == ComparisonResult.GREATER_THAN) {
				copy._location -= 1;
			}
		}

		else if (this.isDelete() && other.isDelete) {
			debug('Delete vs. Delete. locationRelation = ', locationRelation);
			if (locationRelation == ComparisonResult.GREATER_THAN) {
				copy._location -= 1;
			}

			// if the location is equal, these ops commute

		} else {
			fail("Unrecognized operation types " + this.type() + " " + other.type());
		}

		if (DEBUG) {
			let tJson = {};
			copy.fillJson(tJson);
			debug('Transform result: ', tJson);
		}

		return copy;
	}
}

class TextOperationModel implements OperationModel {
	private _chars: Array<string>;

	constructor(text: string) {
		this._chars = text.split('');
	}

	public render(): string {
		return this._chars.join('');
	}

	public execute(op_: Operation): void {
		let op = <TextOp>op_;

		if (op.isInsert()) {
			if (op.location() < 0) {
			fail({
				message: 'Insert location is negative',
				operation: op,
				document: this.render()
			});
			}

			if (op.location() > this._chars.length) {
			fail({
				message: 'Insert location is too big',
				operation: op,
				document: this.render()
			});
			}

			this._chars.splice(op.location(), 0, op.char());
		}

		else if (op.isDelete()) {
			if (op.location() < 0) {
			fail({
				message: 'Delete location is negative',
				operation: op,
				document: this.render()
			});
			}

			if (op.location() > this._chars.length - 1) {
			fail({
				message: 'Delete location is too big',
				operation: op,
				document: this.render()
			});
			}

			this._chars.splice(op.location(), 1);
		} else {
			fail('Unhandled op type ' + op.type());
		}
	}
}