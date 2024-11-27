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

    const handleReset = resetButton.clicked(emit(loginForm.reset()))

    const foo = state(
        null,
        #myComponent.init(() => 'init'),
        #myComponent.#increment.clicked(() => 'increment clicked'),
        #myComponent.#decrement.clicked(() => 'decrement clicked'),
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
    
    <MyComponent #myComponent />
</page>