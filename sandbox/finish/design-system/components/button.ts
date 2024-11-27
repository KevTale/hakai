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