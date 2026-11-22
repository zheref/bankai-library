package io.zheref.bankai.core.utils

import kotlin.time.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.LocalTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime
import kotlin.time.Duration
import kotlin.time.DurationUnit
import kotlin.time.toDuration

public val Int.minutes get(): Duration {
    return this.toDuration(DurationUnit.MINUTES)
}

public val Int.seconds get(): Duration {
    return this.toDuration(DurationUnit.SECONDS)
}

public fun Instant.toLocalDate(timezone: TimeZone = TimeZone.currentSystemDefault()): LocalDate {
    return toLocalDateTime(timezone).date
}

public fun Instant.toLocalTime(timezone: TimeZone = TimeZone.currentSystemDefault()): LocalTime {
    return toLocalDateTime(timezone).time
}