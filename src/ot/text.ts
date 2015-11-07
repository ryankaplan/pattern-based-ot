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

	static Insert(char: string, location: number) {
		return new TextOp(Type.INSERT, char, location);
	}

	static Delete(location: number) {
		return new TextOp(Type.DELETE, null, location);
	}

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

	transform(other_: Operation) {
		let other = <TextOp>other_;

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

class TextOperationModel implements OperationModel {
	private _chars: Array<string>;

	constructor(text: string) {
		this._chars = text.split('');
	}

	public render(): string {
		return this._chars.join();
	}

	public executeOperation(op_: Operation): void {
		let op = <TextOp>op_;

		if (op.isInsert()) {
			insertAtIndex(this._chars, op.char(), op.location());
		} else if (op.isDelete()) {
			removeAtIndex(this._chars, op.location());
		} else {
			fail("Unrecognized operation type" + op.type());
		}
	}
}