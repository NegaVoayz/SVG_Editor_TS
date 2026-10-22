import type {
  DocumentTransaction,
} from "../document/Document.js";

export class UnitOfWork {
  public constructor(private readonly transaction: DocumentTransaction) {}

  public get appendChild(): DocumentTransaction["appendChild"] {
    return this.transaction.appendChild.bind(this.transaction);
  }

  public get attachLast(): DocumentTransaction["attachLast"] {
    return this.transaction.attachLast.bind(this.transaction);
  }

  public get insertAt(): DocumentTransaction["insertAt"] {
    return this.transaction.insertAt.bind(this.transaction);
  }

  public get attachAt(): DocumentTransaction["attachAt"] {
    return this.transaction.attachAt.bind(this.transaction);
  }

  public get update(): DocumentTransaction["update"] {
    return this.transaction.update.bind(this.transaction);
  }

  public get erase(): DocumentTransaction["erase"] {
    return this.transaction.erase.bind(this.transaction);
  }

  public get find(): DocumentTransaction["find"] {
    return this.transaction.find.bind(this.transaction);
  }

  public get commit(): DocumentTransaction["commit"] {
    return this.transaction.commit.bind(this.transaction);
  }

  public get rollback(): DocumentTransaction["rollback"] {
    return this.transaction.rollback.bind(this.transaction);
  }
}

