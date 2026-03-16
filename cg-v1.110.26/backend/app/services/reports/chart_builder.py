"""
ChartBuilder - Generate beautiful SVG charts for CommonGround reports.

Uses pure SVG generation for perfect print quality at any size.
Updated March 2026 — teal/blue/gold brand identity.
"""

import math
from typing import Optional
from dataclasses import dataclass


# Brand colors matching _brand.css (teal/blue/gold identity)
COLORS = {
    "teal": "#3DAA8A",
    "teal_dark": "#2C8A6E",
    "teal_light": "#5BC4A0",
    "teal_subtle": "#E6F5F0",
    "blue": "#2D6A8F",
    "blue_dark": "#1E4E6B",
    "blue_light": "#4BA8C8",
    "blue_subtle": "#E8F4F8",
    "gold": "#F5A623",
    "gold_light": "#FDE8C8",
    "gold_subtle": "#FFF8ED",
    "error": "#DC2626",
    "error_light": "#FEE2E2",
    "border": "#E2E8F0",
    "border_light": "#F1F5F9",
    "text_primary": "#1E293B",
    "text_secondary": "#475569",
    "text_muted": "#94A3B8",
    "white": "#FFFFFF",
    # Legacy aliases
    "sage": "#3DAA8A",
    "sage_dark": "#2C8A6E",
    "sage_light": "#5BC4A0",
    "sage_subtle": "#E6F5F0",
    "slate": "#2D6A8F",
    "slate_light": "#4BA8C8",
    "slate_subtle": "#E8F4F8",
    "amber": "#F5A623",
    "amber_light": "#FDE8C8",
}


@dataclass
class ChartData:
    """Data point for charts."""
    label: str
    value: float
    color: str = COLORS["teal"]


class ChartBuilder:
    """Generate SVG charts for PDF reports."""

    @staticmethod
    def donut_chart(
        value: float,
        total: float,
        label: str = "",
        center_text: Optional[str] = None,
        color: str = COLORS["teal"],
        background_color: str = COLORS["border_light"],
        size: int = 140,
        stroke_width: int = 20,
    ) -> str:
        """
        Generate a donut chart showing a single percentage.

        Args:
            value: The value to display (e.g., days with Parent A)
            total: The total (e.g., total days)
            label: Label text below the chart
            center_text: Text to display in center (defaults to percentage)
            color: Fill color for the value portion
            background_color: Background ring color
            size: Chart size in pixels
            stroke_width: Width of the donut ring

        Returns:
            SVG markup string
        """
        percentage = (value / total * 100) if total > 0 else 0
        center = size / 2
        radius = (size - stroke_width) / 2

        # Calculate the stroke-dasharray for the arc
        circumference = 2 * math.pi * radius
        filled = (percentage / 100) * circumference

        if center_text is None:
            center_text = f"{percentage:.0f}%"

        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">
            <!-- Background ring -->
            <circle
                cx="{center}" cy="{center}" r="{radius}"
                fill="none"
                stroke="{background_color}"
                stroke-width="{stroke_width}"
            />
            <!-- Value arc -->
            <circle
                cx="{center}" cy="{center}" r="{radius}"
                fill="none"
                stroke="{color}"
                stroke-width="{stroke_width}"
                stroke-dasharray="{filled} {circumference}"
                stroke-dashoffset="{circumference / 4}"
                stroke-linecap="round"
                transform="rotate(-90 {center} {center})"
            />
            <!-- Center text -->
            <text
                x="{center}" y="{center - 5}"
                text-anchor="middle"
                font-family="DM Sans, sans-serif"
                font-size="24"
                font-weight="700"
                fill="{COLORS['text_primary']}"
            >{center_text}</text>
            <text
                x="{center}" y="{center + 18}"
                text-anchor="middle"
                font-family="DM Sans, sans-serif"
                font-size="11"
                fill="{COLORS['text_secondary']}"
            >{label}</text>
        </svg>
        '''

    @staticmethod
    def split_donut_chart(
        value_a: float,
        value_b: float,
        label_a: str = "Parent A",
        label_b: str = "Parent B",
        color_a: str = COLORS["teal"],
        color_b: str = COLORS["blue"],
        size: int = 160,
        stroke_width: int = 24,
        center_text: Optional[str] = None,
        center_sublabel: Optional[str] = None,
    ) -> str:
        """
        Generate a split donut chart showing two values (e.g., custody split).

        Args:
            value_a: First value (e.g., Parent A days)
            value_b: Second value (e.g., Parent B days)
            label_a: Label for first segment
            label_b: Label for second segment
            color_a: Color for first segment
            color_b: Color for second segment
            size: Chart size in pixels
            stroke_width: Width of the donut ring
            center_text: Optional override for center text (default: total value)
            center_sublabel: Optional override for center sublabel (default: "total days")

        Returns:
            SVG markup string
        """
        total = value_a + value_b
        if total == 0:
            pct_a, pct_b = 50, 50
        else:
            pct_a = (value_a / total) * 100
            pct_b = (value_b / total) * 100

        center = size / 2
        radius = (size - stroke_width) / 2
        circumference = 2 * math.pi * radius

        arc_a = (pct_a / 100) * circumference
        arc_b = (pct_b / 100) * circumference
        gap = 4  # Small gap between segments

        # Determine center text
        main_text = center_text if center_text is not None else str(int(total))
        sub_text = center_sublabel if center_sublabel is not None else "total days"

        # Adjust font size based on text length to prevent overflow
        font_size = "20"
        if len(main_text) > 8:
            font_size = "16"
        if len(main_text) > 12:
            font_size = "14"

        return f'''
        <svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" xmlns="http://www.w3.org/2000/svg">
            <!-- Parent A arc -->
            <circle
                cx="{center}" cy="{center}" r="{radius}"
                fill="none"
                stroke="{color_a}"
                stroke-width="{stroke_width}"
                stroke-dasharray="{arc_a - gap} {circumference}"
                stroke-dashoffset="{circumference / 4}"
                stroke-linecap="round"
                transform="rotate(-90 {center} {center})"
            />
            <!-- Parent B arc -->
            <circle
                cx="{center}" cy="{center}" r="{radius}"
                fill="none"
                stroke="{color_b}"
                stroke-width="{stroke_width}"
                stroke-dasharray="{arc_b - gap} {circumference}"
                stroke-dashoffset="{circumference / 4 - arc_a}"
                stroke-linecap="round"
                transform="rotate(-90 {center} {center})"
            />
            <!-- Center text -->
            <text
                x="{center}" y="{center - 8}"
                text-anchor="middle"
                font-family="DM Sans, sans-serif"
                font-size="{font_size}"
                font-weight="700"
                fill="{COLORS['text_primary']}"
            >{main_text}</text>
            <text
                x="{center}" y="{center + 12}"
                text-anchor="middle"
                font-family="DM Sans, sans-serif"
                font-size="11"
                fill="{COLORS['text_secondary']}"
            >{sub_text}</text>
        </svg>
        '''

    @staticmethod
    def horizontal_bar(
        data: list[ChartData],
        width: int = 400,
        bar_height: int = 28,
        bar_gap: int = 12,
        show_values: bool = True,
        max_value: Optional[float] = None,
    ) -> str:
        """
        Generate horizontal bar chart for comparing values.

        Args:
            data: List of ChartData objects
            width: Total chart width
            bar_height: Height of each bar
            bar_gap: Gap between bars
            show_values: Whether to show value labels
            max_value: Maximum value for scaling (defaults to max in data)

        Returns:
            SVG markup string
        """
        if not data:
            return ""

        label_width = 100
        bar_width = width - label_width - 60
        max_val = max_value or max(d.value for d in data)
        height = len(data) * (bar_height + bar_gap)

        bars_svg = []
        for i, d in enumerate(data):
            y = i * (bar_height + bar_gap)
            fill_width = (d.value / max_val * bar_width) if max_val > 0 else 0

            bars_svg.append(f'''
                <!-- {d.label} -->
                <text
                    x="0" y="{y + bar_height / 2 + 4}"
                    font-family="DM Sans, sans-serif"
                    font-size="11"
                    font-weight="500"
                    fill="{COLORS['text_secondary']}"
                >{d.label}</text>
                <!-- Background -->
                <rect
                    x="{label_width}" y="{y}"
                    width="{bar_width}" height="{bar_height}"
                    rx="4"
                    fill="{COLORS['border_light']}"
                />
                <!-- Fill -->
                <rect
                    x="{label_width}" y="{y}"
                    width="{fill_width}" height="{bar_height}"
                    rx="4"
                    fill="{d.color}"
                />
                <!-- Value -->
                <text
                    x="{label_width + bar_width + 8}" y="{y + bar_height / 2 + 4}"
                    font-family="DM Sans, sans-serif"
                    font-size="12"
                    font-weight="600"
                    fill="{COLORS['text_primary']}"
                >{d.value:.0f}{'%' if max_val == 100 else ''}</text>
            ''')

        return f'''
        <svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
            {''.join(bars_svg)}
        </svg>
        '''

    @staticmethod
    def comparison_bars(
        value_a: float,
        value_b: float,
        label_a: str = "Parent A",
        label_b: str = "Parent B",
        color_a: str = COLORS["teal"],
        color_b: str = COLORS["blue"],
        width: int = 400,
        bar_height: int = 32,
        is_percentage: bool = True,
    ) -> str:
        """
        Generate side-by-side comparison bars for two parents.

        Args:
            value_a: Value for Parent A
            value_b: Value for Parent B
            label_a: Label for Parent A
            label_b: Label for Parent B
            color_a: Color for Parent A
            color_b: Color for Parent B
            width: Total chart width
            bar_height: Height of each bar
            is_percentage: Whether values are percentages (adds % symbol)

        Returns:
            SVG markup string
        """
        label_width = 80
        bar_width = width - label_width - 50
        height = (bar_height + 16) * 2

        max_val = max(value_a, value_b, 1)
        fill_a = (value_a / max_val * bar_width) if max_val > 0 else 0
        fill_b = (value_b / max_val * bar_width) if max_val > 0 else 0

        suffix = "%" if is_percentage else ""

        return f'''
        <svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
            <!-- Parent A -->
            <text
                x="0" y="{bar_height / 2 + 4}"
                font-family="DM Sans, sans-serif"
                font-size="11"
                font-weight="500"
                fill="{COLORS['text_secondary']}"
            >{label_a}</text>
            <rect
                x="{label_width}" y="0"
                width="{bar_width}" height="{bar_height}"
                rx="4"
                fill="{COLORS['border_light']}"
            />
            <rect
                x="{label_width}" y="0"
                width="{fill_a}" height="{bar_height}"
                rx="4"
                fill="{color_a}"
            />
            <text
                x="{label_width + bar_width + 8}" y="{bar_height / 2 + 4}"
                font-family="DM Sans, sans-serif"
                font-size="13"
                font-weight="600"
                fill="{color_a}"
            >{value_a:.1f}{suffix}</text>

            <!-- Parent B -->
            <text
                x="0" y="{bar_height + 16 + bar_height / 2 + 4}"
                font-family="DM Sans, sans-serif"
                font-size="11"
                font-weight="500"
                fill="{COLORS['text_secondary']}"
            >{label_b}</text>
            <rect
                x="{label_width}" y="{bar_height + 16}"
                width="{bar_width}" height="{bar_height}"
                rx="4"
                fill="{COLORS['border_light']}"
            />
            <rect
                x="{label_width}" y="{bar_height + 16}"
                width="{fill_b}" height="{bar_height}"
                rx="4"
                fill="{color_b}"
            />
            <text
                x="{label_width + bar_width + 8}" y="{bar_height + 16 + bar_height / 2 + 4}"
                font-family="DM Sans, sans-serif"
                font-size="13"
                font-weight="600"
                fill="{color_b}"
            >{value_b:.1f}{suffix}</text>
        </svg>
        '''

    @staticmethod
    def stat_badge(
        value: str,
        label: str,
        sublabel: str = "",
        color: str = COLORS["teal"],
    ) -> str:
        """
        Generate a stat badge for key metrics.

        Args:
            value: The main value to display
            label: Label text
            sublabel: Optional sublabel
            color: Value color

        Returns:
            HTML markup string (not SVG)
        """
        sublabel_html = f'<div class="stat-sublabel">{sublabel}</div>' if sublabel else ""
        return f'''
        <div class="stat-card">
            <div class="stat-value" style="color: {color}">{value}</div>
            <div class="stat-label">{label}</div>
            {sublabel_html}
        </div>
        '''

    @staticmethod
    def legend(
        items: list[tuple[str, str, str]],  # [(label, color, value), ...]
    ) -> str:
        """
        Generate a chart legend.

        Args:
            items: List of (label, color, value) tuples

        Returns:
            HTML markup string
        """
        items_html = []
        for label, color, value in items:
            items_html.append(f'''
                <div class="legend-item">
                    <span class="legend-dot" style="background: {color}"></span>
                    <span>{label}: {value}</span>
                </div>
            ''')

        return f'''
        <div class="chart-legend">
            {''.join(items_html)}
        </div>
        '''

    @staticmethod
    def legend_box(
        title: str,
        items: list[tuple[str, str]],  # [(label, color), ...]
    ) -> str:
        """
        Generate a bordered legend box with color swatches and labels.

        Reusable across all reports for chart/status color explanations.

        Args:
            title: Legend box title (e.g., "Color Key", "Chart Legend")
            items: List of (label, color) tuples

        Returns:
            HTML markup string
        """
        items_html = []
        for label, color in items:
            items_html.append(f'''
                <div class="legend-box-item">
                    <span class="legend-box-swatch" style="background: {color}"></span>
                    <span>{label}</span>
                </div>
            ''')

        return f'''
        <div class="legend-box">
            <div class="legend-box-title">{title}</div>
            <div class="legend-box-items">
                {''.join(items_html)}
            </div>
        </div>
        '''
