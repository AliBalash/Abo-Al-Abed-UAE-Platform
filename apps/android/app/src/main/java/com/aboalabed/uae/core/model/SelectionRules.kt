package com.aboalabed.uae.core.model

fun defaultOptionIds(group: ProductModifierGroup): Set<String> {
    val defaults = group.options.filter { it.isDefault }.map { it.id }
    return (defaults.ifEmpty { group.options.take(group.minSelections).map { it.id } }).toSet()
}

fun toggleModifierOption(
    group: ProductModifierGroup,
    current: Set<String>,
    optionId: String
): Set<String> {
    val next = current.toMutableSet()
    if (optionId in next) {
        if (next.size > group.minSelections) {
            next.remove(optionId)
        }
    } else {
        if (next.size >= group.maxSelections) {
            next.firstOrNull()?.let(next::remove)
        }
        next.add(optionId)
    }
    return next
}
