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