"""
Timing Node Executors
Delays, scheduling, and event waiting

These nodes control timing:
- DELAY: Wait for a duration
- SCHEDULE: Wait until a specific time
- EVENT_WAIT: Wait for an event
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional
from ..schemas import ProcessNode, NodeType
from ..state import ProcessState, ProcessContext
from ..result import NodeResult, ExecutionError
from .base import BaseNodeExecutor, register_executor


@register_executor(NodeType.DELAY)
class DelayNodeExecutor(BaseNodeExecutor):
    """
    Delay node executor
    
    Pauses execution for a specified duration.
    
    Config:
        delay_type: seconds, minutes, hours, until_time, until_datetime
        duration: Duration value (for seconds/minutes/hours)
        until: Target time or datetime (for until_time/until_datetime)
        max_wait_seconds: Maximum wait time (safety limit)
    """
    
    display_name = "Delay"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute delay node"""
        
        delay_type = self.get_config_value(node, 'delay_type', 'seconds')
        duration = self.get_config_value(node, 'duration', 0)
        until = self.get_config_value(node, 'until')
        max_wait = self.get_config_value(node, 'max_wait_seconds', 86400)  # 24 hours default
        
        logs = [f"Delay type: {delay_type}"]
        
        # Calculate wait time in seconds
        wait_seconds = 0
        
        if delay_type == 'seconds':
            # Interpolate if it's an expression
            if isinstance(duration, str):
                duration = state.evaluate(duration)
            wait_seconds = float(duration)
            logs.append(f"Waiting {wait_seconds} seconds")
            
        elif delay_type == 'minutes':
            if isinstance(duration, str):
                duration = state.evaluate(duration)
            wait_seconds = float(duration) * 60
            logs.append(f"Waiting {duration} minutes")
            
        elif delay_type == 'hours':
            if isinstance(duration, str):
                duration = state.evaluate(duration)
            wait_seconds = float(duration) * 3600
            logs.append(f"Waiting {duration} hours")
            
        elif delay_type == 'until_time':
            # Wait until a specific time today (or tomorrow if time has passed)
            if isinstance(until, str):
                until = state.interpolate_string(until)
            
            try:
                # Parse time (HH:MM or HH:MM:SS)
                time_parts = until.split(':')
                target_hour = int(time_parts[0])
                target_minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                target_second = int(time_parts[2]) if len(time_parts) > 2 else 0
                
                now = datetime.utcnow()
                target = now.replace(
                    hour=target_hour,
                    minute=target_minute,
                    second=target_second,
                    microsecond=0
                )
                
                # If target time has passed, wait until tomorrow
                if target <= now:
                    target += timedelta(days=1)
                
                wait_seconds = (target - now).total_seconds()
                logs.append(f"Waiting until {target.isoformat()}")
                
            except Exception as e:
                return NodeResult.failure(
                    error=ExecutionError.validation_error(f"Invalid time format: {e}"),
                    logs=logs
                )
                
        elif delay_type == 'until_datetime':
            # Wait until a specific datetime
            if isinstance(until, str):
                until = state.interpolate_string(until)
            
            try:
                # Parse ISO datetime
                target = datetime.fromisoformat(until.replace('Z', '+00:00'))
                if target.tzinfo:
                    target = target.replace(tzinfo=None)  # Convert to naive UTC
                
                now = datetime.utcnow()
                wait_seconds = (target - now).total_seconds()
                
                if wait_seconds < 0:
                    logs.append("Target datetime is in the past - continuing immediately")
                    wait_seconds = 0
                else:
                    logs.append(f"Waiting until {target.isoformat()}")
                    
            except Exception as e:
                return NodeResult.failure(
                    error=ExecutionError.validation_error(f"Invalid datetime format: {e}"),
                    logs=logs
                )
        
        else:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Unknown delay type: {delay_type}"),
                logs=logs
            )
        
        # Apply safety limit
        if wait_seconds > max_wait:
            logs.append(f"Wait time {wait_seconds}s exceeds max {max_wait}s - capping")
            wait_seconds = max_wait
        
        # For very long delays, we should use waiting status instead of actually sleeping
        # This allows the process to be checkpointed and resumed
        if wait_seconds > 300:  # More than 5 minutes
            resume_at = datetime.utcnow() + timedelta(seconds=wait_seconds)
            logs.append(f"Long delay - pausing for resume at {resume_at.isoformat()}")
            
            return NodeResult.waiting(
                waiting_for='delay',
                waiting_metadata={
                    'resume_at': resume_at.isoformat(),
                    'wait_seconds': wait_seconds,
                    'delay_type': delay_type
                }
            )
        
        # For short delays, actually wait
        if wait_seconds > 0:
            logs.append(f"Sleeping for {wait_seconds:.1f} seconds")
            await asyncio.sleep(wait_seconds)
            logs.append("Delay complete")
        
        return NodeResult.success(
            output={
                'delayed_seconds': wait_seconds,
                'completed_at': datetime.utcnow().isoformat()
            },
            logs=logs
        )


@register_executor(NodeType.SCHEDULE)
class ScheduleNodeExecutor(BaseNodeExecutor):
    """
    Schedule node executor
    
    Waits until a scheduled time.
    Similar to Delay with until_datetime but with more scheduling options.
    
    Config:
        schedule_type: datetime, cron, business_hours
        datetime: Target datetime
        cron: Cron expression (for recurring)
        timezone: Timezone for scheduling
        business_hours: Business hours configuration
    """
    
    display_name = "Schedule"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute schedule node"""
        
        schedule_type = self.get_config_value(node, 'schedule_type', 'datetime')
        target_datetime = self.get_config_value(node, 'datetime')
        timezone = self.get_config_value(node, 'timezone', 'UTC')
        
        logs = [f"Schedule type: {schedule_type}"]
        
        if schedule_type == 'datetime':
            if not target_datetime:
                return NodeResult.failure(
                    error=ExecutionError.validation_error("datetime is required"),
                    logs=logs
                )
            
            target_str = state.interpolate_string(target_datetime)
            
            try:
                target = datetime.fromisoformat(target_str.replace('Z', '+00:00'))
                if target.tzinfo:
                    target = target.replace(tzinfo=None)
                
                now = datetime.utcnow()
                wait_seconds = (target - now).total_seconds()
                
                if wait_seconds <= 0:
                    logs.append("Scheduled time has passed - continuing")
                    return NodeResult.success(
                        output={'waited': False, 'reason': 'past_schedule'},
                        logs=logs
                    )
                
                logs.append(f"Scheduled for {target.isoformat()}")
                
                # Use waiting status for proper checkpoint/resume
                return NodeResult.waiting(
                    waiting_for='schedule',
                    waiting_metadata={
                        'resume_at': target.isoformat(),
                        'wait_seconds': wait_seconds,
                        'timezone': timezone
                    }
                )
                
            except Exception as e:
                return NodeResult.failure(
                    error=ExecutionError.validation_error(f"Invalid datetime: {e}"),
                    logs=logs
                )
        
        elif schedule_type == 'business_hours':
            # Wait until next business hours with full timezone and holiday support
            now = datetime.utcnow()
            
            business_config = self.get_config_value(node, 'business_hours', {
                'start_hour': 9,
                'end_hour': 17,
                'weekdays_only': True,
                'timezone': 'UTC',
                'holidays': [],  # List of dates in YYYY-MM-DD format
                'custom_days': {}  # e.g., {"monday": {"start": 10, "end": 16}}
            })
            
            start_hour = business_config.get('start_hour', 9)
            end_hour = business_config.get('end_hour', 17)
            weekdays_only = business_config.get('weekdays_only', True)
            timezone_str = business_config.get('timezone', 'UTC')
            holidays = set(business_config.get('holidays', []))
            custom_days = business_config.get('custom_days', {})
            
            # Convert to timezone-aware time if pytz available
            try:
                import pytz
                tz = pytz.timezone(timezone_str)
                local_now = now.replace(tzinfo=pytz.UTC).astimezone(tz)
                logs.append(f"Local time ({timezone_str}): {local_now.strftime('%Y-%m-%d %H:%M')}")
            except ImportError:
                local_now = now
                logs.append(f"Using UTC (pytz not installed)")
            
            # Get day-specific hours if configured
            day_name = local_now.strftime('%A').lower()
            if day_name in custom_days:
                day_config = custom_days[day_name]
                start_hour = day_config.get('start', start_hour)
                end_hour = day_config.get('end', end_hour)
            
            # Check if today is a holiday
            today_str = local_now.strftime('%Y-%m-%d')
            is_holiday = today_str in holidays
            
            # Check if we're in business hours
            is_weekday = local_now.weekday() < 5
            is_business_hour = start_hour <= local_now.hour < end_hour
            
            if (not weekdays_only or is_weekday) and is_business_hour and not is_holiday:
                logs.append("Currently in business hours - continuing")
                return NodeResult.success(
                    output={'waited': False, 'reason': 'in_business_hours'},
                    logs=logs
                )
            
            # Calculate next business hours start
            target = local_now.replace(hour=start_hour, minute=0, second=0, microsecond=0)
            
            if local_now.hour >= start_hour or is_holiday:
                target += timedelta(days=1)
            
            # Skip weekends if configured
            if weekdays_only:
                while target.weekday() >= 5:
                    target += timedelta(days=1)
            
            # Skip holidays
            max_skip_days = 30  # Safety limit
            skip_count = 0
            while target.strftime('%Y-%m-%d') in holidays and skip_count < max_skip_days:
                target += timedelta(days=1)
                skip_count += 1
                # Also skip weekends when moving for holidays
                if weekdays_only:
                    while target.weekday() >= 5:
                        target += timedelta(days=1)
            
            # Convert back to UTC for storage
            try:
                target_utc = target.astimezone(pytz.UTC).replace(tzinfo=None)
            except:
                target_utc = target
            
            wait_seconds = (target_utc - now).total_seconds()
            logs.append(f"Next business hours: {target.strftime('%Y-%m-%d %H:%M')} ({timezone_str})")
            
            return NodeResult.waiting(
                waiting_for='schedule',
                waiting_metadata={
                    'resume_at': target_utc.isoformat(),
                    'wait_seconds': wait_seconds,
                    'reason': 'business_hours',
                    'timezone': timezone_str
                }
            )
        
        else:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Unknown schedule type: {schedule_type}"),
                logs=logs
            )


@register_executor(NodeType.EVENT_WAIT)
class EventWaitNodeExecutor(BaseNodeExecutor):
    """
    Event Wait node executor
    
    Waits for an external event to occur.
    
    Config:
        event_type: Type of event to wait for
        event_filter: Filter expression for the event
        timeout_seconds: Maximum wait time
        timeout_action: fail, skip, continue_with_default
        default_value: Value to use on timeout
    """
    
    display_name = "Event Wait"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute event wait node"""
        
        event_type = self.get_config_value(node, 'event_type', 'webhook')
        event_filter = self.get_config_value(node, 'event_filter')
        timeout_seconds = self.get_config_value(node, 'timeout_seconds', 3600)
        timeout_action = self.get_config_value(node, 'timeout_action', 'fail')
        default_value = self.get_config_value(node, 'default_value')
        
        logs = [f"Waiting for event: {event_type}"]
        
        if event_filter:
            logs.append(f"Filter: {event_filter}")
        
        # Calculate timeout
        timeout_at = datetime.utcnow() + timedelta(seconds=timeout_seconds)
        logs.append(f"Timeout at: {timeout_at.isoformat()}")
        
        # Return waiting status - actual event handling is done by the engine
        return NodeResult.waiting(
            waiting_for='event',
            waiting_metadata={
                'event_type': event_type,
                'event_filter': event_filter,
                'timeout_at': timeout_at.isoformat(),
                'timeout_action': timeout_action,
                'default_value': default_value,
                'execution_id': context.execution_id,
                'node_id': node.id
            }
        )
