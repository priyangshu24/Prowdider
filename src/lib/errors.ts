export class DuplicateLeadError extends Error {
  constructor(message = "A lead already exists for this phone number and service.") {
    super(message);
    this.name = "DuplicateLeadError";
  }
}

export class AllocationError extends Error {
  constructor(message = "Unable to allocate the lead to exactly three providers.") {
    super(message);
    this.name = "AllocationError";
  }
}
