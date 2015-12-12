function insertAtIndex(arr:Array<any>, item:any, index:number) {
  arr.splice(index, 0, item);
}

function removeAtIndex(arr:Array<any>, index:number): any {
  return arr.splice(index, 1)[0];
}

function removeElement(arr: Array<any>, element: any): any {
  let index = arr.indexOf(element);
  if (index !== -1) {
    return arr.splice(index, 1)[0];
  }
  return null;
}

function addElementIfMissing(arr: Array<any>, element: any) {
  for (var elt of arr) {
    if (element === elt) {
      return;
    }
  }
  arr.push(element);
}

function listEqual(a: Array<any>, b: Array<any>): boolean {
  if (a === b) {
    return true;
  }

  if (a === null || b === null) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}
