# Hakai 

Hakai is a full-stack framework built on Deno, designed to simplify the creation of web applications.

The core principles of Hakai are:


1. **Exceptional Developer Experience**
Hakai prioritizes a seamless developer experience by providing opinionated guidelines for structuring your code using code colocation and separation of concerns principles. This approach ensures your codebase remains intuitive and easy to work with.

2. **Declarative by Design**
Hakai embraces a declarative approach. Instead of explicitly managing variable assignments, you simply define the desired outcome, and Hakai handles the rest. This reduces software entropy, making your code more maintainable and less prone to turning into spaghetti code.


3. **Built on Deno**
Leveraging Deno's unique capabilities, Hakai is fast, secure, and straightforward, making it a natural choice for modern development.

Now, let’s explore how Hakai implements these principles.

## The `scopes` folder

In Hakai, applications are organized around scopes. 


```
my-app/
    scopes/
        auth/
        dashboard/
        legals/
        my-account/
        products/
```

A scope can include:
- pages
- components
- a store
- tests

**These elements are isolated within their respective scope and cannot be reused outside of it.**


For example, if you define a component in the **dashboard** scope, it cannot be used within the **my-account** scope. This design enforces the principles of code colocation and separation of concerns.

We recommend splitting scopes by business/domain capabilities where it makes sense.

#### Exploring a ``scope``


```
my-app/
    scopes/
        dashboard/
            analytics.page.kai
            overview.page.kai
            reports.page.kai
            reports_sales.page.kai
            store.ts
            tests.ts
            widget.component.kai
```

This scope contains the following:
- 4 pages:
    - `analytics.page.kai` renders at `/analytics`
    - `overview.page.kai` renders at `/overview`
    - `reports.page.kai` renders at `/reports`
    - `reports_sales.page.kai` renders at `/reports/sales`
- a store   
    - `store.ts` contains data and logic that are accessible only within the `dashboard` scope.
- a component
    - `widget.component.kai` is reusable across all pages inside the `dashboard` scope, but only within this scope.
- tests
    - `tests.ts` contains tests for the `dashboard` scope.

This strict scoping ensures that each part of your application is self-contained, predictable, and easy to maintain.

Now, let’s dive deeper into how pages work.

## Pages


```html
// scopes/dashboard/overview.page.kai
<template>
    <p>Logged in as {{ username() }}</p>
</template>

<script>
    export const username = state('Kai')
</script>

<style>
    h1 {
        color: red;
    }
</style>
```

A page consists of the following parts:
- `<template>` – Defines the UI structure of the page.
- `<script>` – Contains the data and logic for the page.
- `<style>`  – Specifies the styles for the page.

1. Use `export` to make a value from `<script>` accessible in the `<template>`.
2. Use `{{ val() }}` to read a value in the `<template>`.

Each time a `state` value changes, the part of the page that depends on it is automatically updated.

You might be wondering how to modify the value in `state`. Don't worry! We'll cover this in detail in the [reactivity](#reactivity) section.

## Components

Components in Hakai are declared in the same way as pages.

```html
<template>
    <div class="widget">
        <h3>{{ title() }}</h3>
        <p>{{ content() }}</p>
    </div>
</template>

<script>
    export const title = prop('Widget Title')
    export const content = prop('Widget content')
</script>

<style>
    .widget {
        border: 1px solid #ccc;
        padding: 10px;
        border-radius: 4px;
    }
</style>
```

##### Defining properties

The `prop` function defines the component’s properties, which are passed to the component by the page or component that uses it.



#### Using a component

To use a component, simply add it to the `<template>` using its file name in CamelCase.


```html
// scopes/dashboard/overview.page.kai
<template>
    <Widget/>
</template>
```
##### Passing properties

You can pass properties to the component in several ways:

1. With a static value

```html
<template>
    <Widget
        :title="'Overview'" 
        :content="'Overview content'"
    />
</template>
```

2. Using a state function

```html
<template>
    <Widget
        :title="title" 
        :content="content" /* or simply :content */
    />
</template>

<script>
    export const title = state('Overview')
    export const content = state('Overview content')
</script>
```

3. Using the `props` function.

```html 
<template>
    <Widget :props />
</template>

<script>
    export const props = props({
        title: 'Widget Title',
        content: 'Widget content'
    })
</script>
```

#### Scoped components

Components declared within a `scope` are only available in that specific `scope`.

```
my-app/
    scopes/
        dashboard/
            analytics.page.kai
            overview.page.kai
            widget.component.kai // available only in the dashboard scope
```

#### Global components

Components declared in the `design-system` folder are available across **the entire application**.

```
my-app/
    design-system/
        components/
            textfield.component.kai // can be used in any scope
```

#### Why This Matters
Hakai’s code colocation principle ensures that components are grouped logically, making your codebase more organized and maintainable. By clearly defining the scope and responsibilities of each component, you can better manage complexity and ensure a clean architecture.

## Store

Stores are useful when you need to share data between multiple pages or multiple `scopes`.
Just like components, a `store` declared in a `scope` is **only** available within that `scope`.

```
my-app/
    scopes/
        dashboard/
            analytics.page.kai
            overview.page.kai
            reports.page.kai
            store.ts /* only available in the dashboard scope */
```

```ts
// scopes/dashboard/store.ts
export const widgets = state([...])
```	

Now, the `store` object is available in the entire `dashboard` scope, allowing you to access the `widgets` state or any other state declared in the `store`.

```html
// scopes/dashboard/overview.page.kai
<template>
    <p>{{ store.widgets() }}</p>
</template>
```

Alternatively, you can destructure the store in the page.

```html
// scopes/dashboard/overview.page.kai
<template>
    <p>{{ widgets() }}</p>
</template>

<script>
    export const { widgets } = store()
</script>
```

You can also declare global stores if you need to share data between multiple scopes.

```
my-app/
    scopes/
        ...
    stores/
        user.store.ts
```

```html
// scopes/dashboard/overview.page.kai
<template>
    <p>{{ name() }}</p>
</template>
<script>
    export const { name } = globalStore('user')
</script>
```

## Reactivity and declarativity

Hakai is declarative. You never have to assign values to variables. Instead, you describe what you want to happen, and Hakai figures out how to make it happen.

```html
<template>
    <span>{{ count() }}</span>
</template>

<script>
    export const count = state(0)
</script>
```

The `state` function is the core of reactivity in Hakai.
In this example, we created a reactive variable `count` with initial value `0`.

Let's try to increment `count`:

```html
<template>
    <span>{{ count() }}</span>

    <button #increment>increment</button>
</template>

<script>
    const count = state(
        0,
        #increment.clicked((count) => count + 1)
    )

</script>
```	

First, we add a ref named `increment` to the button.
Then, in the `state` function, we listen to the `clicked` event of the `increment` ref.

Now, each time the button is clicked, the function `(count) => count + 1` is called and whatever it returns will be the new value of `count`.

We can add as many listeners as we want to the `state` function.

```html
<template>
    <span>{{ count() }}</span>

    <button #increment>increment</button>
    <button #decrement>decrement</button>
    <button #reset>reset</button>
</template>

<script>
    const count = state(
        0,
        #increment.clicked((count) => count + 1),
        #decrement.clicked((count) => count - 1),
        #reset.clicked(() => 0)
    )
</script>
```

We can also create `state` that depend on other `state`.

```html
<template>
    <span>{{ count() }}</span>
    <span>{{ doubleCount() }}</span>

    <button #increment>increment</button>
    <button #decrement>decrement</button>
    <button #reset>reset</button>
</template>

<script>
    export const count = state(
        0,
        #increment.clicked((count) => count + 1),
        #decrement.clicked((count) => count - 1),
        #reset.clicked(() => 0)
    )
    export const doubleCount = state(count() * 2)
</script>
```

Each time `count` changes, `doubleCount` is automatically updated.

As you can see, we don't listen to click events and assign a function to it then it that function we would imperatively change the value of `count`.
Here, we just describe what we want to happen and when.
We don't have to dig into functions, callbacks and assignments scattered all over the code.
With Hakai, just looking at a `state` function tells you everything you need to know about it.

### Operators

For more complex scenarios, we can pass a set of operators to events.

```html
<script>
    const count = state(
        0,
        #increment.clicked(
            filter(count => count < 10),
            map(count => count + 1)
        )
    )
</script>
```

These operators work similarly to [RxJS operators](https://rxjs.dev/operators).
In this example, the `count` variable will be incremented only if it is less than 10.

```html
<template>
    <input #search type="text" />
    {{ data()}}
</template>

<script>
    const data = state(
        null,
        #search.typed(
            debounce(500),
            fetch((query) => `https://api.example.com/search?q=${query}`)
        )
    )

</script>
```

Here, we listen to the `typed` event of the `search` ref.
Each time the user types something in the input, the `debounce` operator is called with a delay of 500ms.
Then, the `fetch` operator is called with the current value of `term`.
The resulting value, a promise, is automatically unwrapped and assigned to the `data` variable.

We can also listen to the event from the page itself using the `#page` ref.

```html
<template>
    @for (todo of todos()) {
        <p>{{ todo.name }}</p>
    }
</template>

<script>
    const todos = state<Todo[]>(
        null,
        #page.init(
            fetch(() => `https://dummyjson.com/todos`)
        ),
    )
</script>
```