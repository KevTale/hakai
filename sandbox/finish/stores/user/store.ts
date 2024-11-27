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