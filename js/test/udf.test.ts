import { describe, expect, it } from "vitest";
import {
  INIT,
  REPLACE,
  type Reducer,
  type Thunk,
  applyMiddleware,
  combineReducers,
  compose,
  createStore,
  createThunkMiddleware,
  middleware,
} from "../src/udf/index.js";

type Counter = { count: number; log: string[] };
type CounterAction = { type: "inc"; by: number } | { type: "reset" } | typeof INIT | typeof REPLACE;

const counter: Reducer<Counter, CounterAction> = (state, action) => {
  if (typeof action === "symbol") return { ...state, log: [...state.log, action.description ?? ""] };
  switch (action.type) {
    case "inc":
      return { ...state, count: state.count + action.by };
    case "reset":
      return { ...state, count: 0 };
  }
};

describe("createStore", () => {
  it("dispatches INIT on creation and reduces actions", () => {
    const store = createStore(counter, { count: 0, log: [] });
    expect(store.state.log).toEqual(["@@bankai/INIT"]);
    store.dispatch({ type: "inc", by: 2 });
    expect(store.getState().count).toBe(2);
  });

  it("notifies subscribers and stops after unsubscribing (twice is a no-op)", () => {
    const store = createStore(counter, { count: 0, log: [] });
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.dispatch({ type: "inc", by: 1 });
    unsubscribe();
    unsubscribe();
    store.dispatch({ type: "inc", by: 1 });
    expect(calls).toBe(1);
  });

  it("refuses getState from inside a reducer and functions as actions", () => {
    let store: ReturnType<typeof createStore<number, unknown>> | undefined;
    store = createStore<number, unknown>((state, action) => {
      if (action === "peek") store?.getState();
      return state;
    }, 0);
    expect(() => store?.dispatch("peek")).toThrow(/getState/);
    expect(() => store?.dispatch(() => {})).toThrow(TypeError);
  });

  it("dispatches REPLACE when the reducer is replaced", () => {
    const store = createStore(counter, { count: 0, log: [] });
    store.replaceReducer(counter);
    expect(store.state.log).toEqual(["@@bankai/INIT", "@@bankai/REPLACE"]);
  });
});

describe("combineReducers / compose", () => {
  it("runs reducers in sequence (BankaiUDF semantics)", () => {
    const double: Reducer<number> = (s) => s * 2;
    const addOne: Reducer<number> = (s) => s + 1;
    expect(combineReducers(double, addOne)(3, {})).toBe(7);
  });

  it("composes right to left", () => {
    expect(compose<number>((x) => x * 2, (x) => x + 1)(3)).toBe(8);
  });
});

describe("applyMiddleware and thunks", () => {
  it("runs middleware in order and lets thunks dispatch", () => {
    const seen: string[] = [];
    const logger = middleware<Counter, CounterAction>((_store, next, action) => {
      if (typeof action === "object") seen.push(action.type);
      return next(action);
    });
    const store = createStore(
      counter,
      { count: 0, log: [] },
      applyMiddleware(createThunkMiddleware<Counter, CounterAction>("extra"), logger),
    );
    let extra: unknown;
    const thunk: Thunk<Counter, CounterAction> = (dispatch, getState, argument) => {
      extra = argument;
      dispatch({ type: "inc", by: getState().count + 5 });
      return "done";
    };
    expect(store.dispatch(thunk as unknown as CounterAction)).toBe("done");
    expect(extra).toBe("extra");
    expect(store.state.count).toBe(5);
    expect(seen).toEqual(["inc"]);
  });

  it("refuses dispatch while middleware is being constructed", () => {
    const eager = middleware<number>((_s, next, a) => next(a));
    const constructing = (store: { dispatch: (a: unknown) => unknown }) => {
      store.dispatch("too early");
      return eager(store as never);
    };
    expect(() => createStore<number>((s) => s, 0, applyMiddleware(constructing as never))).toThrow(
      /constructing your middleware/,
    );
  });
});
