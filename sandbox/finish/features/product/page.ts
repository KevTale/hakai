// @ts-nocheck

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