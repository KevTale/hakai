```
app/
    design-system/
        components/
            button.ts
            dialog.ts
            input.ts
            select.ts
        theme.css
    features/
        cart/
            api.ts
            mocks.ts
            page.ts
            tests.ts
        login/
            api.ts
            guard.ts
            mocks.ts
            page.ts
            tests.ts
        my-account/
            api.ts
            mocks.ts
            page.ts
            types.ts
            tests.ts
        my-account_profile/
            api.ts
            page.ts
            tests.ts
        products/
            api.ts
            guard.ts
            page.ts
            types.ts
            tests.ts
            utils.ts
        product/
            api.ts
            guard.ts
            page.ts
            types.ts
            tests.ts
    stores/
        user/
            store.ts
            tests.ts
    types/
        user.ts
    utils/
        is-authenticated.ts
        format-currency.ts
.gitignore
deno.json
hakai.ts
README.md
```

```ts
// hakai.ts
export default hakaiConfig({
  rootPage: "login",
});
```

```ts
// product/page.ts

<store>
export const product = state(
    null,
    urlParam("id").changed(
        filter(id => id !== undefined),
        switch(),
        fetch(id => `api/products/${id}`),
        mapResponse(product => ({
            ...product,
            acquired: false
        }))
    ),
    buyButton.clicked(
        post(product => `api/products/${product.id}/buy`, {}),
        mapResponse(product => ({
            ...product,
            acquired: true
        }))
    )
)

export const itemInProduct = state(
    null,
    searchInput.changed(
        filter(value => value !== undefined),
        debounce(500),
        map(value => product().data?.items.find(item => item.name === value))
    ),
    urlParam("id").changed(
        map(() => null)
    )
)
</store>

<meta>
    const title = computed(() => `${product().data?.name} - ${injectUser().username}`)
</meta>

<page render="server">
@if (product().loading)
    <p>Loading...</p>

@else if (product().error)
    <p>Error: {product().error.message}</p>

@else if (product().data)
    <p>{product().data.name}</p>
    <BuyButton #buyButton/>
    <Input #searchInput />
    <p>{itemInProduct().name}</p>
</page>

<component name="BuyButton">
    <template>
        <Button size="small">Buy</Button>
    </template>

    <script>

    </script>
</component>
```

```ts
// product/guard.ts

export function allowEnter(id: string) {
  if (isAuthenticated() && id !== undefined) {
    return true;
  }
  return redirect("/login");
}

export function allowExit() {
  // ...
}
```

```ts
// design-system/components/button.ts
<template>
    <button :class="{
        'px-4 py-2 text-base': size === 'medium',
        'px-2 py-1 text-sm': size === 'small',
        'px-6 py-3 text-lg': size === 'large'
    }">
        <slot />
    </button>
</template>

<script>
type Size = "medium" | "small" | "large"
export const size = input<Size>("medium")
</script>
```

```ts
// stores/user/store.ts
export function userStore() {
    const user = state(
        null,
        injectApp().init(
            with(appConfig()),
            fetch((appConfig) => `api/${appConfig.api.version}/user`)
        )
    )

    return {
        user
    }
}
```

```ts
// features/login/page.ts

<store>
    export const loginForm = form(
        {
            username: ['', required],
            password: ['', required],
            confirm: ['', [required, (value, form) => form.password() === value]]
        },
        injectPage().init(
            with(appConfig()),
            fetch((appConfig) => `api/${appConfig.api.version}/login`),
            mapResponse(({data}) => ({
                username: data.username,
                password: data.password,
                confirm: data.password
            }))
        )
    )

    const handleFormSubmit = effect(
        loginForm.submitted(
            post('api/login', loginForm.data),
            tap((response) => {
                if (!response.error) {
                    redirect("/")
                } else {

                }
            })
        )
    )

    const handleReset = effect(
        resetButton.clicked(
            loginForm.reset()
        )
    )

</store>

<page>
    <p>Login</p>
    <form :form="loginForm">
        <Input :field="username" />
        <Input :field="password" />
        <Button type="submit">Submit</Button>
    </form>

    <Button #resetButton>Reset</Button>
</page>
```

<template>
    <button #increment>increment</button>
    <button #decrement>decrement</button>
    <button #reset>reset</button>

    <span>{{ count() }}</span>
    <span>{{ doubleCount() }}</span>

</template>

<script>
    const count = state(
        0,
        #increment.clicked((count) => count++),
        #decrement.clicked((count) => count--),
        #reset.clicked((count) => count = 0)
    )

    const doubleCount = state(count * 2)
</script>

<template>
    <input #search type="text" />
    {{ data()}}
</template>

<script>
    const data = state(
        null,
        #search.typed((term) => fetch(`https://api.example.com/search?q=${term}`))
    )

</script>

<script>
    const count = prop(
        0,
        #increment.clicked((count) => count++),
        #decrement.clicked((count) => count--),
        #reset.clicked((count) => count = 0)
    )
</script>

```html
<template>
  <MyComponent #myComponent />
</template>

<script>
  const foo = state(
    null,
    #myComponent.init(() => "init"),
    #myComponent.#increment.clicked(() => "increment clicked"),
    #myComponent.#decrement.clicked(() => "decrement clicked"),
  );
</script>
```
