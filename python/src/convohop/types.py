"""Request inputs and response models of the ConvoHop operations.

Enums are string literals. Response models are frozen dataclasses built from validated responses; ``to_dict()``
returns their wire form. Inputs are frozen dataclasses whose ``None`` fields are omitted from the request.
"""

from ._generated.types import *  # noqa: F403
from ._generated.types import __all__ as __all__
