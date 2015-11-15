/**
 * Copyright (c) 2013 Petka Antonov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

// This was copied from here: https://github.com/petkaantonov/deque/blob/master/js/deque.js
// I ported it to a typescript class and gave it a _data attribute that holds its values
// instead of stuffing them into the `this` instance.

var isArray = Array.isArray;

function arrayMove(src: any, srcIndex: number, dst: any, dstIndex: number, len: number): void {
  for (var j = 0; j < len; ++j) {
    dst[j + dstIndex] = src[j + srcIndex];
    src[j + srcIndex] = void 0;
  }
}

function pow2AtLeast(n: number): number {
  n = n >>> 0;
  n = n - 1;
  n = n | (n >> 1);
  n = n | (n >> 2);
  n = n | (n >> 4);
  n = n | (n >> 8);
  n = n | (n >> 16);
  return n + 1;
}

function getCapacity(capacity: any): number {
  if (typeof capacity !== "number") {
    if (isArray(capacity)) {
      capacity = capacity.length;
    }
    else {
      return 16;
    }
  }
  return pow2AtLeast(
    Math.min(
      Math.max(16, capacity), 1073741824)
  );
}

class Deque<T> {
  private _data: { [index: number]: T } = {};

  // public for tests. TODO(ryan): there must be a better way to do this
  public _capacity: number;
  public _length: number;
  public _front: number;

  constructor(capacity: any = 16) {
    this._capacity = getCapacity(capacity);
    this._length = 0;
    this._front = 0;
    if (isArray(capacity)) {
      var len = capacity.length;
      for (var i = 0; i < len; ++i) {
        this._data[i] = capacity[i];
      }
      this._length = len;
    }
  }

  toArray(): Array<T> {
    var len = this._length;
    var ret = new Array(len);
    var front = this._front;
    var capacity = this._capacity;
    for (var j = 0; j < len; ++j) {
      ret[j] = this._data[(front + j) & (capacity - 1)];
    }
    return ret;
  }

  push(item: T): number {
    var argsLength = arguments.length;
    var length = this._length;
    if (argsLength > 1) {
      var capacity = this._capacity;
      if (length + argsLength > capacity) {
        for (var i = 0; i < argsLength; ++i) {
          this.checkCapacity(length + 1);
          var j = (this._front + length) & (this._capacity - 1);
          this._data[j] = arguments[i];
          length++;
          this._length = length;
        }
        return length;
      }
      else {
        var j = this._front;
        for (var i = 0; i < argsLength; ++i) {
          this._data[(j + length) & (capacity - 1)] = arguments[i];
          j++;
        }
        this._length = length + argsLength;
        return length + argsLength;
      }

    }

    if (argsLength === 0) return length;

    this.checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this._data[i] = item;
    this._length = length + 1;
    return length + 1;
  }

  pop(): T {
    var length = this._length;
    if (length === 0) {
      return void 0;
    }
    var i = (this._front + length - 1) & (this._capacity - 1);
    var ret = this._data[i];
    this._data[i] = void 0;
    this._length = length - 1;
    return <T>ret;
  }

  shift(): T {
    var length = this._length;
    if (length === 0) {
      return void 0;
    }
    var front = this._front;
    var ret = this._data[front];
    this._data[front] = void 0;
    this._front = (front + 1) & (this._capacity - 1);
    this._length = length - 1;
    return ret;
  }

  unshift(item: T): number {
    var length = this._length;
    var argsLength = arguments.length;

    if (argsLength > 1) {
      var capacity = this._capacity;
      if (length + argsLength > capacity) {
        for (var i = argsLength - 1; i >= 0; i--) {
          this.checkCapacity(length + 1);
          var capacity = this._capacity;
          var j = (((( this._front - 1 ) &
          ( capacity - 1) ) ^ capacity ) - capacity );
          this._data[j] = arguments[i];
          length++;
          this._length = length;
          this._front = j;
        }
        return length;
      }
      else {
        var front = this._front;
        for (var i = argsLength - 1; i >= 0; i--) {
          var j = (((( front - 1 ) &
          ( capacity - 1) ) ^ capacity ) - capacity );
          this._data[j] = arguments[i];
          front = j;
        }
        this._front = front;
        this._length = length + argsLength;
        return length + argsLength;
      }
    }

    if (argsLength === 0) return length;

    this.checkCapacity(length + 1);
    var capacity = this._capacity;
    var i = (((( this._front - 1 ) &
    ( capacity - 1) ) ^ capacity ) - capacity );
    this._data[i] = item;
    this._length = length + 1;
    this._front = i;
    return length + 1;
  }

  peekBack(): T {
    var length = this._length;
    if (length === 0) {
      return void 0;
    }
    var index = (this._front + length - 1) & (this._capacity - 1);
    return this._data[index];
  }

  peekFront(): T {
    if (this._length === 0) {
      return void 0;
    }
    return this._data[this._front];
  }

  get(index: number): T {
    var i = index;
    if ((i !== (i | 0))) {
      return void 0;
    }
    var len = this._length;
    if (i < 0) {
      i = i + len;
    }
    if (i < 0 || i >= len) {
      return void 0;
    }
    return this._data[(this._front + i) & (this._capacity - 1)];
  }

  isEmpty(): boolean {
    return this._length === 0;
  }

  clear(): void {
    var len = this._length;
    var front = this._front;
    var capacity = this._capacity;
    for (var j = 0; j < len; ++j) {
      this._data[(front + j) & (capacity - 1)] = void 0;
    }
    this._length = 0;
    this._front = 0;
  }

  toString(): string {
    return this.toArray().toString();
  }

  valueOf(): string { return this.toString(); }
  popFront(): T { return this.shift(); }
  popBack(): T { return this.pop(); }
  pushFront(item: T): number { return this.unshift(item); }
  pushBack(item: T): number { return this.push(item); }
  enqueue(item: T): number { return this.push(item); }
  dequeue(): T { return this.shift(); }
  toJSON(): Array<T> { return this.toArray(); }

  get length(): number {
    return this._length;
  }

  private checkCapacity(size: number): void {
    if (this._capacity < size) {
      this.resizeTo(getCapacity(this._capacity * 1.5 + 16));
    }
  }

  private resizeTo(capacity: number): void {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    if (front + length > oldCapacity) {
      var moveItemsCount = (front + length) & (oldCapacity - 1);
      arrayMove(this._data, 0, this._data, oldCapacity, moveItemsCount);
    }
  }
}
