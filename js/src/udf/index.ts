/**
 * Unidirectional data flow — TypeScript port of BankaiUDF (`redux/*.kt`), which is in
 * turn adapted from ReduxKotlin (MIT; see NOTICE.md).
 *
 * Imported as `@zheref/bankai-core/udf`.
 */

export type Action = unknown;
export type Reducer<S, A = Action> = (state: S, action: A) => S;
export type Dispatcher<A = Action> = (action: A) => unknown;
export type StoreSubscriber = () => void;
export type StoreSubscription = () => void;

export interface Store<S, A = Action> {
  getState(): S;
  dispatch: Dispatcher<A>;
  subscribe(listener: StoreSubscriber): StoreSubscription;
  replaceReducer(next: Reducer<S, A>): void;
  /** The current state: `getState()`. */
  readonly state: S;
}

export type StoreCreator<S, A = Action> = (reducer: Reducer<S, A>, preloadedState: S) => Store<S, A>;
export type StoreEnhancer<S, A = Action> = (create: StoreCreator<S, A>) => StoreCreator<S, A>;
export type Middleware<S, A = Action> = (
  store: Store<S, A>,
) => (next: Dispatcher<A>) => (action: A) => unknown;

/** Dispatched once when a store is created, so every reducer returns its initial state. */
export const INIT: unique symbol = Symbol("@@bankai/INIT");
/** Dispatched when a store's reducer is replaced. */
export const REPLACE: unique symbol = Symbol("@@bankai/REPLACE");

/** Whether `action` can be dispatched to a bare store: anything but a function. */
export function isPlainAction(action: unknown): boolean {
  return typeof action !== "function";
}

/**
 * Creates a store holding the state tree. The only way to change state is
 * `dispatch(action)`. Not safe to call from a reducer: `getState`, `subscribe` and
 * unsubscribing throw while a reducer runs.
 */
export function createStore<S, A = Action>(
  reducer: Reducer<S, A>,
  preloadedState: S,
  enhancer?: StoreEnhancer<S, A>,
): Store<S, A> {
  if (enhancer) {
    return enhancer((r, initial) => createStore(r, initial))(reducer, preloadedState);
  }

  let currentReducer = reducer;
  let currentState = preloadedState;
  let currentListeners: StoreSubscriber[] = [];
  let nextListeners = currentListeners;
  let isDispatching = false;

  const ensureCanMutateNextListeners = (): void => {
    if (nextListeners === currentListeners) nextListeners = [...currentListeners];
  };

  const getState = (): S => {
    if (isDispatching) {
      throw new Error(
        "You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument.",
      );
    }
    return currentState;
  };

  const subscribe = (listener: StoreSubscriber): StoreSubscription => {
    if (isDispatching) {
      throw new Error("You may not call store.subscribe() while the reducer is executing.");
    }
    let isSubscribed = true;
    ensureCanMutateNextListeners();
    nextListeners.push(listener);
    return () => {
      if (!isSubscribed) return;
      if (isDispatching) {
        throw new Error("You may not unsubscribe from a store listener while the reducer is executing.");
      }
      isSubscribed = false;
      ensureCanMutateNextListeners();
      nextListeners.splice(nextListeners.indexOf(listener), 1);
    };
  };

  const dispatch = (action: A): unknown => {
    if (!isPlainAction(action)) {
      throw new TypeError("Actions must not be functions. Use custom middleware (e.g. a thunk) for async actions.");
    }
    if (isDispatching) {
      // The Kotlin seed left this guard commented out, which lets a reducer's nested
      // dispatch be silently overwritten by the outer reducer's result.
      throw new Error("Reducers may not dispatch actions.");
    }
    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }
    currentListeners = nextListeners;
    for (const listener of currentListeners) listener();
    return action;
  };

  const store: Store<S, A> = {
    getState,
    dispatch,
    subscribe,
    replaceReducer(next: Reducer<S, A>): void {
      currentReducer = next;
      store.dispatch(REPLACE as A);
    },
    get state(): S {
      return getState();
    },
  };

  store.dispatch(INIT as A);
  return store;
}

/**
 * Runs `reducers` in sequence, each receiving the state the previous one returned.
 * This is BankaiUDF's semantics, not redux.js's keyed `combineReducers`.
 */
export function combineReducers<S, A = Action>(...reducers: Reducer<S, A>[]): Reducer<S, A> {
  return (state, action) => reducers.reduce((s, reducer) => reducer(s, action), state);
}

/** Composes single-argument functions right to left: `compose(f, g)(x)` is `f(g(x))`. */
export function compose<T>(...functions: ((value: T) => T)[]): (value: T) => T {
  return (value) => functions.reduceRight((acc, fn) => fn(acc), value);
}

/**
 * A store enhancer that runs every dispatch through `middlewares`, first to last.
 * Middleware may not dispatch while it is being constructed.
 */
export function applyMiddleware<S, A = Action>(...middlewares: Middleware<S, A>[]): StoreEnhancer<S, A> {
  return (create) => (reducer, preloadedState) => {
    const store = create(reducer, preloadedState);
    const originalDispatch = store.dispatch;
    store.dispatch = () => {
      throw new Error(
        "Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.",
      );
    };
    const chain = middlewares.map((middleware) => middleware(store));
    store.dispatch = compose(...chain)(originalDispatch);
    return store;
  };
}

/** Builds a middleware from one function of `(store, next, action)`. */
export function middleware<S, A = Action>(
  handle: (store: Store<S, A>, next: Dispatcher<A>, action: A) => unknown,
): Middleware<S, A> {
  return (store) => (next) => (action) => handle(store, next, action);
}

/** An async action: dispatched as a function when the thunk middleware is applied. */
export type Thunk<S, A = Action> = (
  dispatch: Dispatcher<A>,
  getState: () => S,
  extraArgument: unknown,
) => unknown;

/** Middleware that calls dispatched functions as `Thunk`s and passes everything else on. */
export function createThunkMiddleware<S, A = Action>(extraArgument?: unknown): Middleware<S, A> {
  return (store) => (next) => (action) => {
    if (typeof action === "function") {
      return (action as Thunk<S, A>)(store.dispatch, store.getState, extraArgument);
    }
    return next(action);
  };
}
