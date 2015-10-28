function assert(value: boolean, message: string = 'No message'): void {
  if (!value) {
    throw {
      'message': message,
    };
  }
}

enum ComparisonResult {
  GREATER_THAN,
  EQUAL,
  LESS_THAN
}